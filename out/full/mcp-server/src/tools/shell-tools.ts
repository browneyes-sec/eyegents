import { z } from "zod";
import { spawn } from "child_process";

const ALLOWED_COMMANDS = [
  "npm", "pnpm", "yarn", "node", "npx",
  "git", "docker", "docker-compose",
  "kubectl", "helm", "terraform",
  "python", "pip", "python3",
  "go", "cargo", "rustc",
  "make", "cmake",
  "curl", "wget", "jq",
  "ls", "cat", "grep", "find", "head", "tail", "wc",
  "ps", "top", "df", "du", "free"
];

function isAllowed(command: string): boolean {
  return ALLOWED_COMMANDS.some(cmd => command === cmd || command.startsWith(cmd + " "));
}

export const shellTools = [
  {
    name: "shell_exec",
    description: "Execute shell command (allowlisted commands only)",
    inputSchema: z.object({
      command: z.string(),
      args: z.array(z.string()).default([]),
      cwd: z.string().optional(),
      timeout: z.number().default(30000),
      env: z.record(z.string()).optional()
    }),
    handler: async (args: { command: string; args: string[]; cwd?: string; timeout?: number; env?: Record<string, string> }) => {
      const fullCommand = [args.command, ...args.args].join(" ");
      if (!isAllowed(fullCommand)) {
        throw new Error(`Command not allowed: ${fullCommand}. Allowed: ${ALLOWED_COMMANDS.join(", ")}`);
      }

      return new Promise((resolve, reject) => {
        const child = spawn(args.command, args.args, {
          cwd: args.cwd || process.cwd(),
          env: { ...process.env, ...args.env },
          shell: true
        });

        let stdout = "";
        let stderr = "";
        const timeout = setTimeout(() => {
          child.kill("SIGTERM");
          reject(new Error(`Command timed out after ${args.timeout}ms`));
        }, args.timeout);

        child.stdout?.on("data", (data) => { stdout += data.toString(); });
        child.stderr?.on("data", (data) => { stderr += data.toString(); });

        child.on("close", (code) => {
          clearTimeout(timeout);
          if (code === 0) {
            resolve({ stdout, stderr, code });
          } else {
            reject(new Error(`Command exited with code ${code}: ${stderr}`));
          }
        });

        child.on("error", (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
    }
  }
];