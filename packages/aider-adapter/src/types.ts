import { z } from "zod";

/**
 * Request to execute an Aider coding task.
 * Runs on the HOST — spawns aider from the Python venv.
 */
export const AiderRequestSchema = z.object({
  /** Natural language task description for Aider to implement */
  task: z.string().min(1, "Task description is required"),

  /** Specific files to include in context (optional — Aider uses repo-map otherwise) */
  files: z.array(z.string()).optional(),

  /** OpenRouter model ID override (defaults to nemotron-3-super:free) */
  model: z.string().optional(),

  /** Session ID for decision tracking in Qdrant */
  sessionId: z.string().optional(),

  /** If true, only read context — don't edit files */
  readOnly: z.boolean().optional().default(false),

  /** Auto-commit after successful edit (default: false — review first) */
  autoCommit: z.boolean().optional().default(false),

  /** File containing the task for batch execution */
  messageFile: z.string().optional(),

  /** Working directory (defaults to repo root) */
  workDir: z.string().optional(),
});
export type AiderRequest = z.infer<typeof AiderRequestSchema>;

/**
 * Structured result from an Aider execution.
 */
export const AiderResultSchema = z.object({
  /** Whether Aider completed without errors */
  success: z.boolean(),

  /** Git diff of all changes made */
  diff: z.string().optional(),

  /** Files that were changed */
  changedFiles: z.array(z.string()).optional(),

  /** AI-generated summary of what was done */
  summary: z.string().optional(),

  /** Raw stdout from Aider */
  output: z.string().optional(),

  /** Raw stderr from Aider */
  error: z.string().optional(),

  /** Exit code from the Aider process */
  exitCode: z.number().optional(),

  /** Estimated token usage for CostTracker */
  tokenEstimate: z
    .object({
      input: z.number(),
      output: z.number(),
    })
    .optional(),
});
export type AiderResult = z.infer<typeof AiderResultSchema>;

/**
 * Status check result for Aider availability.
 */
export const AiderStatusSchema = z.object({
  available: z.boolean(),
  version: z.string().optional(),
  venvPath: z.string().optional(),
  error: z.string().optional(),
});
export type AiderStatus = z.infer<typeof AiderStatusSchema>;

/**
 * Configuration for the AiderAdapter.
 */
export interface AiderAdapterConfig {
  /** Path to the Aider Python venv (default: .venvs/aider) */
  venvPath: string;

  /** Path to the repo root (default: auto-detected) */
  repoRoot: string;

  /** Default model to use when none specified */
  defaultModel: string;

  /** Default weak model for edit decisions */
  defaultWeakModel: string;

  /** Max execution time in ms (default: 5 min) */
  timeoutMs: number;
}
