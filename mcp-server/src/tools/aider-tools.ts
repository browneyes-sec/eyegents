import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { z } from "zod";

/**
 * MCP tools for executing Aider coding tasks.
 *
 * Architecture note: The MCP server runs inside a Docker container.
 * Aider (Python) must be available in the container or reachable.
 * For production, install Python + aider in the Docker image.
 *
 * For host-side execution, use @eyegents/aider-adapter directly.
 */

const executeSchema = z.object({
  task: z.string().min(1, "Task description is required"),
  files: z.array(z.string()).optional(),
  model: z.string().optional(),
  sessionId: z.string().optional(),
  autoCommit: z.boolean().optional().default(false),
});

const checkSchema = z.object({});

export const aiderTools = [
  {
    name: "aider_execute",
    description:
      "Execute an Aider coding task. Aider reads CONVENTIONS.md + CLAUDE.md for context, " +
      "edits files, and returns a structured diff. Requires Python + aider in the MCP container. " +
      "For host-side usage, import @eyegents/aider-adapter directly.",
    inputSchema: {
      type: "object" as const,
      properties: {
        task: {
          type: "string",
          description: "Natural language task for Aider to implement",
        },
        files: {
          type: "array",
          items: { type: "string" },
          description: "Specific files to include (optional)",
        },
        model: {
          type: "string",
          description: "OpenRouter model override (default: qwen3-coder:free)",
        },
        sessionId: {
          type: "string",
          description: "Session ID for decision tracking",
        },
        autoCommit: {
          type: "boolean",
          description: "Auto-commit after edit (default: false)",
        },
      },
      required: ["task"],
    },
    handler: async (args: Record<string, unknown>) => {
      const parsed = executeSchema.parse(args);

      // Check if aider is available
      const aiderAvailable = checkAiderAvailability();
      if (!aiderAvailable) {
        return {
          success: false,
          error:
            "Aider not available in this environment. " +
            "Install with: pip3 install aider-chat && aider --version" +
            "\n\nFor Docker, rebuild the image: docker compose build mcp-server" +
            "\n\nThe container image includes aider-chat when built with the Dockerfile at mcp-server/Dockerfile.",
        };
      }

      // Build command
      const cmd = buildAiderCommand(parsed);

      try {
        const stdout = execSync(cmd, {
          cwd: process.cwd(),
          env: {
            ...process.env,
            OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "",
          },
          encoding: "utf-8",
          timeout: 300_000,
          maxBuffer: 10 * 1024 * 1024,
        });

        // Capture diff
        let diff: string | null = null;
        try {
          diff = execSync("git diff", {
            cwd: process.cwd(),
            encoding: "utf-8",
            timeout: 5_000,
          }).toString();
        } catch {
          // No diff
        }

        const changedFiles = parseDiff(diff || "");

        return {
          success: true,
          diff: diff || undefined,
          changedFiles,
          output: stdout,
          summary: extractSummary(stdout),
        };
      } catch (e: any) {
        const errMsg = e.stderr || e.message || String(e);
        return {
          success: false,
          error: `Aider execution failed: ${errMsg}`,
          output: e.stdout || undefined,
        };
      }
    },
  },
  {
    name: "aider_check",
    description: "Check if Aider is available in the MCP container environment",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
    handler: async () => {
      const available = checkAiderAvailability();
      let version = "unknown";
      if (available) {
        try {
          version = execSync("aider --version 2>/dev/null || echo 'unknown'", {
            encoding: "utf-8",
            timeout: 10_000,
          }).trim();
        } catch {
          try {
            version = execSync("python3 -m aider --version 2>/dev/null || echo 'unknown'", {
              encoding: "utf-8",
              timeout: 10_000,
            }).trim();
          } catch {
            version = "unknown";
          }
        }
      }
      return {
        available,
        version,
        configFiles: {
          conf: existsSync(".aider.conf.yml"),
          conventions: existsSync("CONVENTIONS.md"),
          settings: existsSync(".aider.model.settings.yml"),
          metadata: existsSync(".aider.model.metadata.json"),
          ignore: existsSync(".aiderignore"),
        },
      };
    },
  },
];

function checkAiderAvailability(): boolean {
  try {
    execSync("aider --version", {
      encoding: "utf-8",
      timeout: 10_000,
      stdio: "ignore",
    });
    return true;
  } catch {
    // Fallback: check via python -m aider
    try {
      execSync("python3 -m aider --version", {
        encoding: "utf-8",
        timeout: 10_000,
        stdio: "ignore",
      });
      return true;
    } catch {
      return false;
    }
  }
}

function buildAiderCommand(params: z.infer<typeof executeSchema>): string {
  const parts: string[] = [
    "aider",
    "--model",
    params.model || "openrouter/qwen/qwen3-coder:free",
    "--weak-model",
    "openrouter/qwen/qwen3-coder:free",
    "--read",
    "CONVENTIONS.md",
    "--read",
    "CLAUDE.md",
    "--aiderignore",
    ".aiderignore",
    "--map-tokens",
    "4096",
    "--map-refresh",
    "files",
    "--model-settings-file",
    ".aider.model.settings.yml",
    "--model-metadata-file",
    ".aider.model.metadata.json",
    "--no-auto-commits",
    "--no-dirty-commits",
    "--yes",
  ];

  if (params.files && params.files.length > 0) {
    parts.push(...params.files);
  }

  // Escape and quote the message
  const escapedTask = params.task.replace(/'/g, "'\\''");
  parts.push("--message", `'${escapedTask}'`);

  return parts.join(" ");
}

function parseDiff(diff: string): string[] {
  const files: string[] = [];
  const regex = /^diff --git a\/(.+?) b\/(.+?)$/gm;
  let match;
  while ((match = regex.exec(diff)) !== null) {
    files.push(match[1]);
  }
  return [...new Set(files)];
}

function extractSummary(output: string): string | undefined {
  const summaryMatch = output.match(/Summary:\s*(.+?)(?:\n|$)/i);
  if (summaryMatch) return summaryMatch[1].trim();
  const editMatch = output.match(/Applied\s+edit\s+to\s+(.+?)(?:\n|$)/i);
  if (editMatch) return `Edited: ${editMatch[1].trim()}`;
  return undefined;
}
