import { execSync, spawn } from "node:child_process";
import { accessSync, existsSync } from "node:fs";
import { constants } from "node:fs";
import type { AiderAdapterConfig, AiderRequest, AiderResult, AiderStatus } from "./types.js";

const DEFAULT_CONFIG: AiderAdapterConfig = {
  venvPath: ".venvs/aider",
  repoRoot: process.cwd(),
  defaultModel: "openrouter/qwen/qwen3-coder:free",
  defaultWeakModel: "openrouter/qwen/qwen3-coder:free",
  timeoutMs: 300_000,
};

/**
 * AiderAdapter — bridges the eyegents multi-agent framework
 * to the Aider AI pair-programming CLI.
 *
 * Runs on the HOST (outside Docker), spawning Aider from the Python venv.
 * Designed to be called directly by the Orchestrator or via MCP proxy.
 */
export class AiderAdapter {
  private config: AiderAdapterConfig;

  constructor(config?: Partial<AiderAdapterConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Cache for resolved aider binary path */
  private aiderBinary: string | null = null;

  /** Known locations to search for the aider binary */
  private readonly AIDER_PATHS = [
    "aider", // PATH lookup
    ".venvs/aider/bin/aider",
    ".venvs/aider/bin/python3", // Will be used with -m aider.chat
    `${process.env.HOME}/.local/bin/aider`,
    `${process.env.HOME}/.local/share/uv/tools/aider-chat/bin/aider`,
    "/usr/local/bin/aider",
  ];

  /**
   * Resolve the path to the aider binary.
   * Tries common locations: PATH, uv-managed install, project venv.
   */
  private resolveAiderBinary(): string {
    if (this.aiderBinary) return this.aiderBinary;

    for (const candidate of this.AIDER_PATHS) {
      try {
        // Try direct executable check
        if (candidate === "aider") {
          execSync("which aider", { stdio: "ignore", timeout: 3000 });
          this.aiderBinary = "aider";
          return this.aiderBinary;
        }
        // Try file existence
        if (existsSync(candidate)) {
          accessSync(candidate, constants.X_OK);
          this.aiderBinary = candidate;
          return this.aiderBinary;
        }
      } catch {}
    }

    // Fallback: return "aider" and let the spawn fail with a clear error
    this.aiderBinary = "aider";
    return this.aiderBinary;
  }

  /**
   * Check if Aider is installed and available on the system.
   */
  async checkAvailability(): Promise<AiderStatus> {
    const status: AiderStatus = {
      available: false,
      venvPath: this.config.venvPath,
    };

    try {
      const binary = this.resolveAiderBinary();
      const version = execSync(`${binary} --version 2>&1`, {
        encoding: "utf-8",
        timeout: 10_000,
      });
      status.available = true;
      status.version = version.trim();
      return status;
    } catch (e) {
      status.error = `Aider binary not found. Install: pip install aider-install && aider-install. Tried: ${this.AIDER_PATHS.join(", ")}`;
      return status;
    }
  }

  /**
   * Execute an Aider coding task.
   * Returns structured result with diff, changed files, and summary.
   */
  async execute(request: AiderRequest): Promise<AiderResult> {
    const availability = await this.checkAvailability();
    if (!availability.available) {
      return {
        success: false,
        error: availability.error || "Aider not available",
      };
    }

    const args = this.buildArgs(request);

    try {
      const result = await this.spawnAider(args, request);

      const changedFiles = this.parseDiff(result.diff || "");
      const summary = this.extractSummary(result.stdout);

      const tokenEstimate = {
        input: Math.ceil(request.task.length / 3.5),
        output: result.stdout ? Math.ceil(result.stdout.length / 3.5) : 0,
      };

      return {
        success: result.exitCode === 0,
        diff: result.diff,
        changedFiles,
        summary,
        output: result.stdout,
        error: result.exitCode !== 0 ? result.stderr : undefined,
        exitCode: result.exitCode,
        tokenEstimate,
      };
    } catch (e) {
      return {
        success: false,
        error: `Aider execution failed: ${String(e)}`,
      };
    }
  }

  /**
   * Dry-run: preview what Aider would change without applying edits.
   */
  async dryRun(request: AiderRequest): Promise<AiderResult> {
    return this.execute({
      ...request,
      readOnly: true,
    });
  }

  /**
   * Build Aider CLI arguments from a structured request.
   */
  private buildArgs(request: AiderRequest): string[] {
    const args: string[] = [];

    // Model routing — aligns with openrouter-routes.json conventions
    args.push("--model", request.model || this.config.defaultModel);
    args.push("--weak-model", this.config.defaultWeakModel);

    // Context files (read-only, prompt-cached)
    args.push("--read", "CONVENTIONS.md");
    args.push("--read", "CLAUDE.md");

    // Config files
    args.push("--aiderignore", ".aiderignore");
    args.push("--map-tokens", "4096");
    args.push("--map-refresh", "files");
    args.push("--model-settings-file", ".aider.model.settings.yml");
    args.push("--model-metadata-file", ".aider.model.metadata.json");

    // Git behavior — safety first
    if (request.autoCommit) {
      args.push("--no-dirty-commits");
      args.push("--attribute-author");
      args.push("--attribute-committer");
    } else {
      args.push("--no-auto-commits");
      args.push("--no-dirty-commits");
    }

    // Read-only mode
    if (request.readOnly) {
      args.push("--read-only");
    }

    // Specific files to include
    if (request.files && request.files.length > 0) {
      args.push(...request.files);
    }

    // Task message
    if (request.task) {
      args.push("--message", request.task);
    }
    if (request.messageFile) {
      args.push("--message-file", request.messageFile);
    }

    // Non-interactive
    args.push("--yes");

    return args;
  }

  /**
   * Spawn Aider as a subprocess and capture output.
   * Supports PATH-installed, uv-managed, and venv-based installs.
   */
  private async spawnAider(
    args: string[],
    request: AiderRequest,
  ): Promise<{
    stdout: string;
    stderr: string;
    diff: string | undefined;
    exitCode: number;
  }> {
    const workDir = request.workDir || this.config.repoRoot;
    const binary = this.resolveAiderBinary();

    // uv-managed or pipx installs: binary is standalone
    // venv installs: use python3 -m aider.chat
    const isPythonVenv = binary.endsWith("python3");
    const cmd = isPythonVenv ? binary : binary;
    const cmdArgs = isPythonVenv ? ["-m", "aider.chat", ...args] : args;

    return new Promise((resolve, reject) => {
      const child = spawn(cmd, cmdArgs, {
        cwd: workDir,
        env: {
          ...process.env,
          OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "",
        },
        stdio: ["pipe", "pipe", "pipe"],
        timeout: this.config.timeoutMs,
      });

      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr?.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        // Extract diff from git
        const diff = this.captureDiff(workDir);
        resolve({
          stdout,
          stderr,
          diff,
          exitCode: code ?? -1,
        });
      });

      child.on("error", (err) => {
        reject(err);
      });
    });
  }

  /**
   * Capture git diff after Aider edits.
   */
  private captureDiff(workDir: string): string | undefined {
    try {
      const diff = execSync("git diff", {
        cwd: workDir,
        encoding: "utf-8",
        timeout: 5_000,
      });
      return diff || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Parse git diff to extract changed file paths.
   */
  private parseDiff(diff: string): string[] {
    const files: string[] = [];
    const regex = /^diff --git a\/(.+?) b\/(.+?)$/gm;
    let match: RegExpExecArray | null;
    // biome-ignore lint/suspicious/noAssignInExpressions: regex exec pattern
    while ((match = regex.exec(diff)) !== null) {
      files.push(match[1]);
    }
    return [...new Set(files)];
  }

  /**
   * Extract a concise summary from Aider's output.
   */
  private extractSummary(output: string): string | undefined {
    // Look for Aider's summary patterns
    const summaryMatch = output.match(/Summary:\s*(.+?)(?:\n|$)/i);
    if (summaryMatch) return summaryMatch[1].trim();

    // Look for "Applied edit" patterns
    const editMatch = output.match(/Applied\s+edit\s+to\s+(.+?)(?:\n|$)/i);
    if (editMatch) return `Edited: ${editMatch[1].trim()}`;

    return undefined;
  }
}
