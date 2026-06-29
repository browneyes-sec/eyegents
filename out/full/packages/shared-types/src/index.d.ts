import { z } from "zod";
export declare const AgentRoleSchema: z.ZodEnum<["orchestrator", "backend", "frontend", "qa", "ops", "fullstack", "certifier"]>;
export type AgentRole = z.infer<typeof AgentRoleSchema>;
export declare const MessageTypeSchema: z.ZodEnum<["task", "result", "clarification", "decision"]>;
export type MessageType = z.infer<typeof MessageTypeSchema>;
export declare const PrioritySchema: z.ZodEnum<["high", "normal", "low"]>;
export type Priority = z.infer<typeof PrioritySchema>;
export declare const CodeChunkSchema: z.ZodObject<{
    id: z.ZodString;
    filePath: z.ZodString;
    language: z.ZodString;
    astType: z.ZodString;
    content: z.ZodString;
    embedding: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    startLine: z.ZodNumber;
    endLine: z.ZodNumber;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    filePath: string;
    language: string;
    astType: string;
    content: string;
    startLine: number;
    endLine: number;
    createdAt: string;
    embedding?: number[] | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    filePath: string;
    language: string;
    astType: string;
    content: string;
    startLine: number;
    endLine: number;
    createdAt: string;
    embedding?: number[] | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type CodeChunk = z.infer<typeof CodeChunkSchema>;
export declare const ConversationSchema: z.ZodObject<{
    id: z.ZodString;
    sessionId: z.ZodString;
    messages: z.ZodArray<z.ZodObject<{
        role: z.ZodEnum<["user", "assistant", "system", "tool"]>;
        content: z.ZodString;
        timestamp: z.ZodString;
        agentRole: z.ZodOptional<z.ZodEnum<["orchestrator", "backend", "frontend", "qa", "ops", "fullstack", "certifier"]>>;
    }, "strip", z.ZodTypeAny, {
        content: string;
        role: "user" | "assistant" | "system" | "tool";
        timestamp: string;
        agentRole?: "orchestrator" | "backend" | "frontend" | "qa" | "ops" | "fullstack" | "certifier" | undefined;
    }, {
        content: string;
        role: "user" | "assistant" | "system" | "tool";
        timestamp: string;
        agentRole?: "orchestrator" | "backend" | "frontend" | "qa" | "ops" | "fullstack" | "certifier" | undefined;
    }>, "many">;
    summary: z.ZodOptional<z.ZodString>;
    decisions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    embedding: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    sessionId: string;
    messages: {
        content: string;
        role: "user" | "assistant" | "system" | "tool";
        timestamp: string;
        agentRole?: "orchestrator" | "backend" | "frontend" | "qa" | "ops" | "fullstack" | "certifier" | undefined;
    }[];
    updatedAt: string;
    embedding?: number[] | undefined;
    summary?: string | undefined;
    decisions?: string[] | undefined;
}, {
    id: string;
    createdAt: string;
    sessionId: string;
    messages: {
        content: string;
        role: "user" | "assistant" | "system" | "tool";
        timestamp: string;
        agentRole?: "orchestrator" | "backend" | "frontend" | "qa" | "ops" | "fullstack" | "certifier" | undefined;
    }[];
    updatedAt: string;
    embedding?: number[] | undefined;
    summary?: string | undefined;
    decisions?: string[] | undefined;
}>;
export type Conversation = z.infer<typeof ConversationSchema>;
export declare const DecisionSchema: z.ZodObject<{
    id: z.ZodString;
    context: z.ZodString;
    rationale: z.ZodString;
    outcome: z.ZodString;
    tags: z.ZodArray<z.ZodString, "many">;
    embedding: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    author: z.ZodEnum<["orchestrator", "backend", "frontend", "qa", "ops", "fullstack", "certifier"]>;
    status: z.ZodEnum<["proposed", "accepted", "rejected", "superseded"]>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "proposed" | "accepted" | "rejected" | "superseded";
    id: string;
    createdAt: string;
    context: string;
    rationale: string;
    outcome: string;
    tags: string[];
    author: "orchestrator" | "backend" | "frontend" | "qa" | "ops" | "fullstack" | "certifier";
    embedding?: number[] | undefined;
}, {
    status: "proposed" | "accepted" | "rejected" | "superseded";
    id: string;
    createdAt: string;
    context: string;
    rationale: string;
    outcome: string;
    tags: string[];
    author: "orchestrator" | "backend" | "frontend" | "qa" | "ops" | "fullstack" | "certifier";
    embedding?: number[] | undefined;
}>;
export type Decision = z.infer<typeof DecisionSchema>;
export declare const SkillPatternSchema: z.ZodObject<{
    id: z.ZodString;
    skillName: z.ZodString;
    pattern: z.ZodString;
    example: z.ZodString;
    embedding: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    tags: z.ZodArray<z.ZodString, "many">;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    tags: string[];
    skillName: string;
    pattern: string;
    example: string;
    embedding?: number[] | undefined;
}, {
    id: string;
    createdAt: string;
    tags: string[];
    skillName: string;
    pattern: string;
    example: string;
    embedding?: number[] | undefined;
}>;
export type SkillPattern = z.infer<typeof SkillPatternSchema>;
export declare const AgentMessageSchema: z.ZodObject<{
    id: z.ZodString;
    from: z.ZodEnum<["orchestrator", "backend", "frontend", "qa", "ops", "fullstack", "certifier"]>;
    to: z.ZodUnion<[z.ZodEnum<["orchestrator", "backend", "frontend", "qa", "ops", "fullstack", "certifier"]>, z.ZodLiteral<"orchestrator">]>;
    type: z.ZodEnum<["task", "result", "clarification", "decision"]>;
    payload: z.ZodObject<{
        taskId: z.ZodString;
        description: z.ZodString;
        context: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        acceptanceCriteria: z.ZodArray<z.ZodString, "many">;
        artifacts: z.ZodOptional<z.ZodArray<z.ZodObject<{
            type: z.ZodString;
            path: z.ZodString;
            content: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            path: string;
            type: string;
            content: string;
        }, {
            path: string;
            type: string;
            content: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        context: Record<string, unknown>;
        taskId: string;
        description: string;
        acceptanceCriteria: string[];
        artifacts?: {
            path: string;
            type: string;
            content: string;
        }[] | undefined;
    }, {
        context: Record<string, unknown>;
        taskId: string;
        description: string;
        acceptanceCriteria: string[];
        artifacts?: {
            path: string;
            type: string;
            content: string;
        }[] | undefined;
    }>;
    metadata: z.ZodObject<{
        timestamp: z.ZodString;
        tokenBudget: z.ZodNumber;
        priority: z.ZodEnum<["high", "normal", "low"]>;
    }, "strip", z.ZodTypeAny, {
        timestamp: string;
        tokenBudget: number;
        priority: "high" | "normal" | "low";
    }, {
        timestamp: string;
        tokenBudget: number;
        priority: "high" | "normal" | "low";
    }>;
}, "strip", z.ZodTypeAny, {
    type: "task" | "result" | "clarification" | "decision";
    id: string;
    metadata: {
        timestamp: string;
        tokenBudget: number;
        priority: "high" | "normal" | "low";
    };
    from: "orchestrator" | "backend" | "frontend" | "qa" | "ops" | "fullstack" | "certifier";
    to: "orchestrator" | "backend" | "frontend" | "qa" | "ops" | "fullstack" | "certifier";
    payload: {
        context: Record<string, unknown>;
        taskId: string;
        description: string;
        acceptanceCriteria: string[];
        artifacts?: {
            path: string;
            type: string;
            content: string;
        }[] | undefined;
    };
}, {
    type: "task" | "result" | "clarification" | "decision";
    id: string;
    metadata: {
        timestamp: string;
        tokenBudget: number;
        priority: "high" | "normal" | "low";
    };
    from: "orchestrator" | "backend" | "frontend" | "qa" | "ops" | "fullstack" | "certifier";
    to: "orchestrator" | "backend" | "frontend" | "qa" | "ops" | "fullstack" | "certifier";
    payload: {
        context: Record<string, unknown>;
        taskId: string;
        description: string;
        acceptanceCriteria: string[];
        artifacts?: {
            path: string;
            type: string;
            content: string;
        }[] | undefined;
    };
}>;
export type AgentMessage = z.infer<typeof AgentMessageSchema>;
export declare const ContextPacketSchema: z.ZodObject<{
    query: z.ZodString;
    codeChunks: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        filePath: z.ZodString;
        language: z.ZodString;
        astType: z.ZodString;
        content: z.ZodString;
        embedding: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        startLine: z.ZodNumber;
        endLine: z.ZodNumber;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        filePath: string;
        language: string;
        astType: string;
        content: string;
        startLine: number;
        endLine: number;
        createdAt: string;
        embedding?: number[] | undefined;
        metadata?: Record<string, unknown> | undefined;
    }, {
        id: string;
        filePath: string;
        language: string;
        astType: string;
        content: string;
        startLine: number;
        endLine: number;
        createdAt: string;
        embedding?: number[] | undefined;
        metadata?: Record<string, unknown> | undefined;
    }>, "many">;
    gitHistory: z.ZodArray<z.ZodObject<{
        hash: z.ZodString;
        message: z.ZodString;
        author: z.ZodString;
        timestamp: z.ZodString;
        files: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        message: string;
        timestamp: string;
        author: string;
        hash: string;
        files: string[];
    }, {
        message: string;
        timestamp: string;
        author: string;
        hash: string;
        files: string[];
    }>, "many">;
    decisions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        context: z.ZodString;
        rationale: z.ZodString;
        outcome: z.ZodString;
        tags: z.ZodArray<z.ZodString, "many">;
        embedding: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        author: z.ZodEnum<["orchestrator", "backend", "frontend", "qa", "ops", "fullstack", "certifier"]>;
        status: z.ZodEnum<["proposed", "accepted", "rejected", "superseded"]>;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        status: "proposed" | "accepted" | "rejected" | "superseded";
        id: string;
        createdAt: string;
        context: string;
        rationale: string;
        outcome: string;
        tags: string[];
        author: "orchestrator" | "backend" | "frontend" | "qa" | "ops" | "fullstack" | "certifier";
        embedding?: number[] | undefined;
    }, {
        status: "proposed" | "accepted" | "rejected" | "superseded";
        id: string;
        createdAt: string;
        context: string;
        rationale: string;
        outcome: string;
        tags: string[];
        author: "orchestrator" | "backend" | "frontend" | "qa" | "ops" | "fullstack" | "certifier";
        embedding?: number[] | undefined;
    }>, "many">;
    skillPatterns: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        skillName: z.ZodString;
        pattern: z.ZodString;
        example: z.ZodString;
        embedding: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        tags: z.ZodArray<z.ZodString, "many">;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: string;
        tags: string[];
        skillName: string;
        pattern: string;
        example: string;
        embedding?: number[] | undefined;
    }, {
        id: string;
        createdAt: string;
        tags: string[];
        skillName: string;
        pattern: string;
        example: string;
        embedding?: number[] | undefined;
    }>, "many">;
    conversationMemory: z.ZodArray<z.ZodObject<{
        role: z.ZodString;
        content: z.ZodString;
        timestamp: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        content: string;
        role: string;
        timestamp: string;
    }, {
        content: string;
        role: string;
        timestamp: string;
    }>, "many">;
    tokenBudget: z.ZodNumber;
    metadata: z.ZodObject<{
        assembledAt: z.ZodString;
        sources: z.ZodArray<z.ZodString, "many">;
        totalTokens: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        assembledAt: string;
        sources: string[];
        totalTokens: number;
    }, {
        assembledAt: string;
        sources: string[];
        totalTokens: number;
    }>;
}, "strip", z.ZodTypeAny, {
    metadata: {
        assembledAt: string;
        sources: string[];
        totalTokens: number;
    };
    decisions: {
        status: "proposed" | "accepted" | "rejected" | "superseded";
        id: string;
        createdAt: string;
        context: string;
        rationale: string;
        outcome: string;
        tags: string[];
        author: "orchestrator" | "backend" | "frontend" | "qa" | "ops" | "fullstack" | "certifier";
        embedding?: number[] | undefined;
    }[];
    tokenBudget: number;
    query: string;
    codeChunks: {
        id: string;
        filePath: string;
        language: string;
        astType: string;
        content: string;
        startLine: number;
        endLine: number;
        createdAt: string;
        embedding?: number[] | undefined;
        metadata?: Record<string, unknown> | undefined;
    }[];
    gitHistory: {
        message: string;
        timestamp: string;
        author: string;
        hash: string;
        files: string[];
    }[];
    skillPatterns: {
        id: string;
        createdAt: string;
        tags: string[];
        skillName: string;
        pattern: string;
        example: string;
        embedding?: number[] | undefined;
    }[];
    conversationMemory: {
        content: string;
        role: string;
        timestamp: string;
    }[];
}, {
    metadata: {
        assembledAt: string;
        sources: string[];
        totalTokens: number;
    };
    decisions: {
        status: "proposed" | "accepted" | "rejected" | "superseded";
        id: string;
        createdAt: string;
        context: string;
        rationale: string;
        outcome: string;
        tags: string[];
        author: "orchestrator" | "backend" | "frontend" | "qa" | "ops" | "fullstack" | "certifier";
        embedding?: number[] | undefined;
    }[];
    tokenBudget: number;
    query: string;
    codeChunks: {
        id: string;
        filePath: string;
        language: string;
        astType: string;
        content: string;
        startLine: number;
        endLine: number;
        createdAt: string;
        embedding?: number[] | undefined;
        metadata?: Record<string, unknown> | undefined;
    }[];
    gitHistory: {
        message: string;
        timestamp: string;
        author: string;
        hash: string;
        files: string[];
    }[];
    skillPatterns: {
        id: string;
        createdAt: string;
        tags: string[];
        skillName: string;
        pattern: string;
        example: string;
        embedding?: number[] | undefined;
    }[];
    conversationMemory: {
        content: string;
        role: string;
        timestamp: string;
    }[];
}>;
export type ContextPacket = z.infer<typeof ContextPacketSchema>;
export declare const VectorSearchRequestSchema: z.ZodObject<{
    query: z.ZodString;
    collection: z.ZodOptional<z.ZodEnum<["code_chunks", "conversations", "decisions", "skill_patterns"]>>;
    limit: z.ZodDefault<z.ZodNumber>;
    filters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    hybrid: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    query: string;
    limit: number;
    hybrid: boolean;
    collection?: "decisions" | "code_chunks" | "conversations" | "skill_patterns" | undefined;
    filters?: Record<string, unknown> | undefined;
}, {
    query: string;
    collection?: "decisions" | "code_chunks" | "conversations" | "skill_patterns" | undefined;
    limit?: number | undefined;
    filters?: Record<string, unknown> | undefined;
    hybrid?: boolean | undefined;
}>;
export type VectorSearchRequest = z.infer<typeof VectorSearchRequestSchema>;
export declare const VectorSearchResultSchema: z.ZodObject<{
    id: z.ZodString;
    score: z.ZodNumber;
    payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    id: string;
    payload: Record<string, unknown>;
    score: number;
}, {
    id: string;
    payload: Record<string, unknown>;
    score: number;
}>;
export type VectorSearchResult = z.infer<typeof VectorSearchResultSchema>;
export declare const MCPToolSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    inputSchema: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    handler: z.ZodString;
}, "strip", z.ZodTypeAny, {
    description: string;
    name: string;
    inputSchema: Record<string, unknown>;
    handler: string;
}, {
    description: string;
    name: string;
    inputSchema: Record<string, unknown>;
    handler: string;
}>;
export type MCPTool = z.infer<typeof MCPToolSchema>;
export declare const GitCommitSchema: z.ZodObject<{
    hash: z.ZodString;
    message: z.ZodString;
    author: z.ZodString;
    email: z.ZodString;
    timestamp: z.ZodString;
    files: z.ZodArray<z.ZodString, "many">;
    diff: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    message: string;
    timestamp: string;
    author: string;
    hash: string;
    files: string[];
    email: string;
    diff?: string | undefined;
}, {
    message: string;
    timestamp: string;
    author: string;
    hash: string;
    files: string[];
    email: string;
    diff?: string | undefined;
}>;
export type GitCommit = z.infer<typeof GitCommitSchema>;
export declare const ModelConfigSchema: z.ZodObject<{
    name: z.ZodString;
    provider: z.ZodString;
    model: z.ZodString;
    limit: z.ZodOptional<z.ZodObject<{
        context: z.ZodNumber;
        output: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        context: number;
        output: number;
    }, {
        context: number;
        output: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    provider: string;
    model: string;
    limit?: {
        context: number;
        output: number;
    } | undefined;
}, {
    name: string;
    provider: string;
    model: string;
    limit?: {
        context: number;
        output: number;
    } | undefined;
}>;
export type ModelConfig = z.infer<typeof ModelConfigSchema>;
export declare const HealthStatusSchema: z.ZodObject<{
    provider: z.ZodString;
    healthy: z.ZodBoolean;
    latencyMs: z.ZodNumber;
    lastError: z.ZodOptional<z.ZodString>;
    circuitOpen: z.ZodBoolean;
    failureCount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    provider: string;
    healthy: boolean;
    latencyMs: number;
    circuitOpen: boolean;
    failureCount: number;
    lastError?: string | undefined;
}, {
    provider: string;
    healthy: boolean;
    latencyMs: number;
    circuitOpen: boolean;
    failureCount: number;
    lastError?: string | undefined;
}>;
export type HealthStatus = z.infer<typeof HealthStatusSchema>;
//# sourceMappingURL=index.d.ts.map