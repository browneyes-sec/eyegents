import { z } from "zod";
import { readFileSync, writeFileSync, statSync, readdirSync, existsSync } from "fs";
import { globSync } from "fast-glob";
import { resolve } from "path";

const ROOT = process.cwd();

export const fsTools = [
  {
    name: "fs_read",
    description: "Read file content with optional line range",
    inputSchema: z.object({
      path: z.string(),
      encoding: z.string().default("utf-8"),
      startLine: z.number().optional(),
      endLine: z.number().optional()
    }),
    handler: async (args: { path: string; encoding?: BufferEncoding; startLine?: number; endLine?: number }) => {
      const fullPath = resolve(ROOT, args.path);
      const content = readFileSync(fullPath, (args.encoding || "utf-8") as BufferEncoding);
      if (args.startLine || args.endLine) {
        const lines = content.split("\n");
        const start = (args.startLine || 1) - 1;
        const end = args.endLine || lines.length;
        return { content: lines.slice(start, end).join("\n") };
      }
      return { content };
    }
  },
  {
    name: "fs_write",
    description: "Write file (creates parent directories)",
    inputSchema: z.object({
      path: z.string(),
      content: z.string(),
      mode: z.string().default("0644")
    }),
    handler: async (args: { path: string; content: string; mode?: string }) => {
      const fullPath = resolve(ROOT, args.path);
      const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
      if (!existsSync(dir)) {
        const { mkdirSync } = await import("fs");
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(fullPath, args.content, { mode: parseInt(args.mode || "0644", 8) });
      return { success: true, path: args.path };
    }
  },
  {
    name: "fs_glob",
    description: "Glob pattern match files",
    inputSchema: z.object({
      pattern: z.string(),
      cwd: z.string().optional()
    }),
    handler: async (args: { pattern: string; cwd?: string }) => {
      const matches = globSync(args.pattern, { cwd: args.cwd || ROOT, absolute: true });
      return { files: matches };
    }
  },
  {
    name: "fs_grep",
    description: "Search file contents (ripgrep-style)",
    inputSchema: z.object({
      pattern: z.string(),
      include: z.string().optional(),
      cwd: z.string().optional()
    }),
    handler: async (args: { pattern: string; include?: string; cwd?: string }) => {
      const files = globSync(args.include || "**/*", { cwd: args.cwd || ROOT, absolute: true });
      const regex = new RegExp(args.pattern);
      const results: Array<{ file: string; line: number; content: string }> = [];
      for (const file of files) {
        try {
          const content = readFileSync(file, "utf-8");
          content.split("\n").forEach((line, i) => {
            if (regex.test(line)) {
              results.push({ file, line: i + 1, content: line.trim() });
            }
          });
        } catch {}
      }
      return { results };
    }
  },
  {
    name: "fs_stat",
    description: "Get file metadata",
    inputSchema: z.object({ path: z.string() }),
    handler: async (args: { path: string }) => {
      const fullPath = resolve(ROOT, args.path);
      const stat = statSync(fullPath);
      return { size: stat.size, mtime: stat.mtime, isFile: stat.isFile(), isDirectory: stat.isDirectory() };
    }
  },
  {
    name: "fs_list",
    description: "List directory contents",
    inputSchema: z.object({ path: z.string().default(".") }),
    handler: async (args: { path?: string }) => {
      const fullPath = resolve(ROOT, args.path || ".");
      const entries = readdirSync(fullPath, { withFileTypes: true });
      return { entries: entries.map(e => ({ name: e.name, isFile: e.isFile(), isDirectory: e.isDirectory() })) };
    }
  }
];