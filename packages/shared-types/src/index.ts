import { z } from "zod";

export const AgentRoleSchema = z.enum([
  "orchestrator",
  "backend",
  "frontend",
  "qa",
  "ops",
  "fullstack",
  "certifier",
  "aider"
]);
export type AgentRole = z.infer<typeof AgentRoleSchema>;

export const MessageTypeSchema = z.enum([
  "task",
  "result",
  "clarification",
  "decision"
]);
export type MessageType = z.infer<typeof MessageTypeSchema>;

export const PrioritySchema = z.enum(["high", "normal", "low"]);
export type Priority = z.infer<typeof PrioritySchema>;

export const CodeChunkSchema = z.object({
  id: z.string(),
  filePath: z.string(),
  language: z.string(),
  astType: z.string(),
  content: z.string(),
  embedding: z.array(z.number()).optional(),
  metadata: z.record(z.unknown()).optional(),
  startLine: z.number(),
  endLine: z.number(),
  createdAt: z.string()
});
export type CodeChunk = z.infer<typeof CodeChunkSchema>;

export const ConversationSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant", "system", "tool"]),
    content: z.string(),
    timestamp: z.string(),
    agentRole: AgentRoleSchema.optional()
  })),
  summary: z.string().optional(),
  decisions: z.array(z.string()).optional(),
  embedding: z.array(z.number()).optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type Conversation = z.infer<typeof ConversationSchema>;

export const DecisionSchema = z.object({
  id: z.string(),
  context: z.string(),
  rationale: z.string(),
  outcome: z.string(),
  tags: z.array(z.string()),
  embedding: z.array(z.number()).optional(),
  author: AgentRoleSchema,
  status: z.enum(["proposed", "accepted", "rejected", "superseded"]),
  createdAt: z.string()
});
export type Decision = z.infer<typeof DecisionSchema>;

export const SkillPatternSchema = z.object({
  id: z.string(),
  skillName: z.string(),
  pattern: z.string(),
  example: z.string(),
  embedding: z.array(z.number()).optional(),
  tags: z.array(z.string()),
  createdAt: z.string()
});
export type SkillPattern = z.infer<typeof SkillPatternSchema>;

export const AgentMessageSchema = z.object({
  id: z.string(),
  from: AgentRoleSchema,
  to: z.union([AgentRoleSchema, z.literal("orchestrator")]),
  type: MessageTypeSchema,
  payload: z.object({
    taskId: z.string(),
    description: z.string(),
    context: z.record(z.unknown()),
    acceptanceCriteria: z.array(z.string()),
    artifacts: z.array(z.object({
      type: z.string(),
      path: z.string(),
      content: z.string()
    })).optional()
  }),
  metadata: z.object({
    timestamp: z.string(),
    tokenBudget: z.number(),
    priority: PrioritySchema
  })
});
export type AgentMessage = z.infer<typeof AgentMessageSchema>;

export const ContextPacketSchema = z.object({
  query: z.string(),
  codeChunks: z.array(CodeChunkSchema),
  gitHistory: z.array(z.object({
    hash: z.string(),
    message: z.string(),
    author: z.string(),
    timestamp: z.string(),
    files: z.array(z.string())
  })),
  decisions: z.array(DecisionSchema),
  skillPatterns: z.array(SkillPatternSchema),
  conversationMemory: z.array(z.object({
    role: z.string(),
    content: z.string(),
    timestamp: z.string()
  })),
  tokenBudget: z.number(),
  metadata: z.object({
    assembledAt: z.string(),
    sources: z.array(z.string()),
    totalTokens: z.number()
  })
});
export type ContextPacket = z.infer<typeof ContextPacketSchema>;

export const VectorSearchRequestSchema = z.object({
  query: z.string(),
  collection: z.enum(["code_chunks", "conversations", "decisions", "skill_patterns"]).optional(),
  limit: z.number().default(10),
  filters: z.record(z.unknown()).optional(),
  hybrid: z.boolean().default(true)
});
export type VectorSearchRequest = z.infer<typeof VectorSearchRequestSchema>;

export const VectorSearchResultSchema = z.object({
  id: z.string(),
  score: z.number(),
  payload: z.record(z.unknown())
});
export type VectorSearchResult = z.infer<typeof VectorSearchResultSchema>;

export const MCPToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.record(z.unknown()),
  handler: z.string()
});
export type MCPTool = z.infer<typeof MCPToolSchema>;

export const GitCommitSchema = z.object({
  hash: z.string(),
  message: z.string(),
  author: z.string(),
  email: z.string(),
  timestamp: z.string(),
  files: z.array(z.string()),
  diff: z.string().optional()
});
export type GitCommit = z.infer<typeof GitCommitSchema>;

export const ModelConfigSchema = z.object({
  name: z.string(),
  provider: z.string(),
  model: z.string(),
  limit: z.object({
    context: z.number(),
    output: z.number()
  }).optional()
});
export type ModelConfig = z.infer<typeof ModelConfigSchema>;

export const HealthStatusSchema = z.object({
  provider: z.string(),
  healthy: z.boolean(),
  latencyMs: z.number(),
  lastError: z.string().optional(),
  circuitOpen: z.boolean(),
  failureCount: z.number()
});
export type HealthStatus = z.infer<typeof HealthStatusSchema>;