import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AiderAdapter } from "./adapter.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
  execSync: vi.fn(),
}));

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  accessSync: vi.fn(),
  constants: { X_OK: 1 },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import { execSync, spawn } from "node:child_process";
import { accessSync, existsSync } from "node:fs";

function mockExecSyncOnce(result: string, shouldThrow = false) {
  if (shouldThrow) {
    vi.mocked(execSync).mockImplementationOnce(() => {
      throw new Error("command failed");
    });
    return;
  }
  vi.mocked(execSync).mockReturnValueOnce(result);
}

function mockSpawnOnce(stdout: string, stderr: string, exitCode: number, diff?: string) {
  const child = {
    stdout: {
      on: vi.fn((_event: string, cb: (d: Buffer) => void) => cb(Buffer.from(stdout))),
    },
    stderr: {
      on: vi.fn((_event: string, cb: (d: Buffer) => void) => cb(Buffer.from(stderr))),
    },
    on: vi.fn((event: string, cb: (code?: number) => void) => {
      if (event === "close") {
        // Simulate diff capture via execSync after close
        if (diff !== undefined) {
          vi.mocked(execSync).mockReturnValueOnce(diff);
        } else {
          vi.mocked(execSync).mockImplementationOnce(() => {
            throw new Error("no diff");
          });
        }
        cb(exitCode);
      }
      if (event === "error") {
        // Don't trigger error for normal close
      }
      return child;
    }),
  };
  vi.mocked(spawn).mockReturnValueOnce(child as any);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AiderAdapter", () => {
  let adapter: AiderAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new AiderAdapter({ repoRoot: "/test/repo" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ------------------------------------------------------------------
  // resolveAiderBinary
  // ------------------------------------------------------------------

  describe("resolveAiderBinary", () => {
    it("finds aider via PATH (which)", () => {
      mockExecSyncOnce("/usr/bin/aider");
      const result = (adapter as any).resolveAiderBinary();
      expect(result).toBe("aider");
      expect(execSync).toHaveBeenCalledWith("which aider", expect.any(Object));
    });

    it("finds aider via venv path", () => {
      // First call to "which aider" fails
      mockExecSyncOnce("", true);
      // Second candidate: .venvs/aider/bin/aider
      vi.mocked(existsSync).mockReturnValueOnce(false); // .venvs/aider/bin/aider doesn't exist
      vi.mocked(existsSync).mockReturnValueOnce(false); // .venvs/aider/bin/python3 doesn't exist
      vi.mocked(existsSync).mockReturnValueOnce(true); // ~/.local/bin/aider exists
      vi.mocked(accessSync).mockImplementationOnce(() => undefined); // and is executable
      const result = (adapter as any).resolveAiderBinary();
      expect(result).toContain(".local/bin/aider");
    });

    it("falls back to 'aider' when nothing is found", () => {
      // All candidates fail
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("not found");
      });
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(accessSync).mockImplementation(() => {
        throw new Error("not executable");
      });
      const result = (adapter as any).resolveAiderBinary();
      expect(result).toBe("aider");
    });

    it("caches the resolved binary", () => {
      mockExecSyncOnce("/usr/bin/aider");
      const first = (adapter as any).resolveAiderBinary();
      const second = (adapter as any).resolveAiderBinary();
      expect(first).toBe("aider");
      expect(second).toBe("aider");
      expect(execSync).toHaveBeenCalledTimes(1); // only called once due to cache
    });
  });

  // ------------------------------------------------------------------
  // buildArgs
  // ------------------------------------------------------------------

  describe("buildArgs", () => {
    it("builds default args with just a task", () => {
      const args = (adapter as any).buildArgs({ task: "add a feature" });
      expect(args).toContain("--model");
      expect(args).toContain("openrouter/deepseek/deepseek-v4-flash");
      expect(args).toContain("--weak-model");
      expect(args).toContain("openrouter/deepseek/deepseek-v4-flash");
      expect(args).toContain("--read");
      expect(args).toContain("CONVENTIONS.md");
      expect(args).toContain("CLAUDE.md");
      expect(args).toContain("--yes");
      expect(args).toContain("--no-auto-commits");
      expect(args).toContain("--no-dirty-commits");
      expect(args).toContain("--message");
      expect(args).toContain("add a feature");
    });

    it("includes files when provided", () => {
      const args = (adapter as any).buildArgs({
        task: "fix bug",
        files: ["src/main.ts", "src/utils.ts"],
      });
      expect(args).toContain("src/main.ts");
      expect(args).toContain("src/utils.ts");
    });

    it("sets auto-commit flags when autoCommit=true", () => {
      const args = (adapter as any).buildArgs({
        task: "refactor",
        autoCommit: true,
      });
      expect(args).toContain("--no-dirty-commits");
      expect(args).toContain("--attribute-author");
      expect(args).toContain("--attribute-committer");
      expect(args).not.toContain("--no-auto-commits");
    });

    it("sets --read-only when readOnly=true", () => {
      const args = (adapter as any).buildArgs({
        task: "review code",
        readOnly: true,
      });
      expect(args).toContain("--read-only");
    });

    it("includes --message-file when provided", () => {
      const args = (adapter as any).buildArgs({
        task: "batch task",
        messageFile: "/tmp/task.txt",
      });
      expect(args).toContain("--message-file");
      expect(args).toContain("/tmp/task.txt");
    });

    it("uses custom model when specified", () => {
      const args = (adapter as any).buildArgs({
        task: "test",
        model: "openrouter/deepseek/deepseek-v4-flash:free",
      });
      expect(args).toContain("openrouter/deepseek/deepseek-v4-flash:free");
      expect(args).not.toContain("qwen3-coder");
    });
  });

  // ------------------------------------------------------------------
  // parseDiff
  // ------------------------------------------------------------------

  describe("parseDiff", () => {
    it("extracts single file from diff", () => {
      const diff = `diff --git a/src/main.ts b/src/main.ts
index abc..def 100644
--- a/src/main.ts
+++ b/src/main.ts
@@ -1,3 +1,4 @@
+console.log("hello");
`;
      const files = (adapter as any).parseDiff(diff);
      expect(files).toEqual(["src/main.ts"]);
    });

    it("extracts multiple files from diff", () => {
      const diff = `diff --git a/src/main.ts b/src/main.ts
index a..b 100644
--- a/src/main.ts
+++ b/src/main.ts
@@ -1 +1 @@
-foo
+bar
diff --git a/src/utils.ts b/src/utils.ts
index c..d 100644
--- a/src/utils.ts
+++ b/src/utils.ts
@@ -1 +1 @@
-old
+new
`;
      const files = (adapter as any).parseDiff(diff);
      expect(files).toEqual(["src/main.ts", "src/utils.ts"]);
    });

    it("returns empty array for empty diff", () => {
      const files = (adapter as any).parseDiff("");
      expect(files).toEqual([]);
    });

    it("deduplicates same file listed twice", () => {
      const diff = `diff --git a/src/main.ts b/src/main.ts
index a..b 100644
--- a/src/main.ts
+++ b/src/main.ts
@@ -1 +1 @@
-a
+b
diff --git a/src/main.ts b/src/main.ts
index a..b 100644
--- a/src/main.ts
+++ b/src/main.ts
@@ -5 +5 @@
-x
+y
`;
      const files = (adapter as any).parseDiff(diff);
      expect(files).toEqual(["src/main.ts"]);
    });
  });

  // ------------------------------------------------------------------
  // extractSummary
  // ------------------------------------------------------------------

  describe("extractSummary", () => {
    it("extracts Summary: pattern", () => {
      const output = "Some output\nSummary: Added new feature to the component\nMore output";
      const summary = (adapter as any).extractSummary(output);
      expect(summary).toBe("Added new feature to the component");
    });

    it("extracts Applied edit to pattern", () => {
      const output = "Applied edit to src/main.ts\nDone!";
      const summary = (adapter as any).extractSummary(output);
      expect(summary).toBe("Edited: src/main.ts");
    });

    it("returns undefined when no pattern matches", () => {
      const output = "Just some regular output without any known patterns.";
      const summary = (adapter as any).extractSummary(output);
      expect(summary).toBeUndefined();
    });

    it("handles case-insensitive summary matching", () => {
      const output = "SUMMARY: implemented the thing";
      const summary = (adapter as any).extractSummary(output);
      expect(summary).toBe("implemented the thing");
    });
  });

  // ------------------------------------------------------------------
  // checkAvailability
  // ------------------------------------------------------------------

  describe("checkAvailability", () => {
    it("returns available when aider responds with version", async () => {
      // resolveAiderBinary → execSync("which aider")
      mockExecSyncOnce("/usr/bin/aider");
      // checkAvailability → execSync("aider --version")
      mockExecSyncOnce("aider 0.86.2\n");
      const status = await adapter.checkAvailability();
      expect(status.available).toBe(true);
      expect(status.version).toBe("aider 0.86.2");
    });

    it("returns unavailable when aider is not found", async () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("command not found");
      });
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(accessSync).mockImplementation(() => {
        throw new Error("not accessible");
      });
      const status = await adapter.checkAvailability();
      expect(status.available).toBe(false);
      expect(status.error).toContain("Aider binary not found");
    });
  });

  // ------------------------------------------------------------------
  // execute
  // ------------------------------------------------------------------

  describe("execute", () => {
    it("returns error when aider is unavailable", async () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("not found");
      });
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(accessSync).mockImplementation(() => {
        throw new Error("not accessible");
      });
      const result = await adapter.execute({ task: "do something" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Aider binary not found");
    });

    it("executes successfully and returns structured result", async () => {
      // checkAvailability: first execSync for resolveAiderBinary
      mockExecSyncOnce("/usr/bin/aider");
      // checkAvailability: second execSync for --version
      mockExecSyncOnce("aider 0.86.2\n");

      // spawn: provide stdout, stderr, exitCode, and diff
      const diffContent =
        "diff --git a/src/main.ts b/src/main.ts\nindex a..b 100644\n--- a/src/main.ts\n+++ b/src/main.ts\n@@ -1 +1 @@\n-old\n+new\n";
      mockSpawnOnce(
        "Applied edit to src/main.ts\nSummary: Updated the main file\n",
        "",
        0,
        diffContent,
      );

      const result = await adapter.execute({ task: "update main.ts" });
      expect(result.success).toBe(true);
      expect(result.diff).toBe(diffContent);
      expect(result.changedFiles).toEqual(["src/main.ts"]);
      expect(result.summary).toBe("Updated the main file");
      expect(result.exitCode).toBe(0);
      expect(result.tokenEstimate).toBeDefined();
      expect(result.tokenEstimate?.input).toBeGreaterThan(0);
      expect(result.tokenEstimate?.output).toBeGreaterThan(0);
    });

    it("handles non-zero exit code as failure", async () => {
      mockExecSyncOnce("/usr/bin/aider");
      mockExecSyncOnce("aider 0.86.2\n");

      mockSpawnOnce("", "Something went wrong", 1, undefined);

      const result = await adapter.execute({ task: "risky change" });
      expect(result.success).toBe(false);
      expect(result.error).toBe("Something went wrong");
      expect(result.exitCode).toBe(1);
    });

    it("handles spawn error gracefully", async () => {
      mockExecSyncOnce("/usr/bin/aider");
      mockExecSyncOnce("aider 0.86.2\n");

      vi.mocked(spawn).mockImplementationOnce(() => {
        throw new Error("ENOENT: spawn aider ENOENT");
      });

      const result = await adapter.execute({ task: "do something" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Aider execution failed");
    });
  });

  // ------------------------------------------------------------------
  // dryRun
  // ------------------------------------------------------------------

  describe("dryRun", () => {
    it("sets readOnly and delegates to execute", async () => {
      mockExecSyncOnce("/usr/bin/aider");
      mockExecSyncOnce("aider 0.86.2\n");
      mockSpawnOnce("", "", 0, "");

      const result = await adapter.dryRun({ task: "preview changes" });
      expect(result.success).toBe(true);
      // Verify spawn was called with --read-only
      const spawnCall = vi.mocked(spawn).mock.calls[0];
      expect(spawnCall[1]).toContain("--read-only");
    });
  });
});
