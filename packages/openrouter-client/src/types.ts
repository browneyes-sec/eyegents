import { z } from "zod";

export const OpenRouterModelSchema = z.object({
	openrouterId: z.string(),
	contextWindow: z.number(),
	maxOutput: z.number(),
	costPerMillionInput: z.number(),
	costPerMillionOutput: z.number(),
	strengths: z.array(z.string()),
	tier: z.enum(["free", "paid"]),
});
export type OpenRouterModel = z.infer<typeof OpenRouterModelSchema>;

export const AgentRouteSchema = z.object({
	model: z.string(),
	description: z.string(),
});
export type AgentRoute = z.infer<typeof AgentRouteSchema>;

export const AgentRoutingConfigSchema = z.object({
	primary: AgentRouteSchema.optional(),
	fallback: AgentRouteSchema.optional(),
	simple: AgentRouteSchema.optional(),
	complex: AgentRouteSchema.optional(),
	complexityThreshold: z.number().optional(),
	complexKeywords: z.array(z.string()).optional(),
});
export type AgentRoutingConfig = z.infer<typeof AgentRoutingConfigSchema>;

export const RoutesConfigSchema = z.object({
	models: z.record(OpenRouterModelSchema),
	agentRoutes: z.record(AgentRoutingConfigSchema),
	localModels: z.object({
		primary: z.string(),
		small: z.string(),
		embedding: z.string(),
	}),
});
export type RoutesConfig = z.infer<typeof RoutesConfigSchema>;

export interface CompletionRequest {
	model: string;
	messages: Array<{ role: string; content: string }>;
	temperature?: number;
	maxTokens?: number;
	stream?: boolean;
	agentRole?: string;
	taskComplexity?: "simple" | "complex";
}

export interface CompletionResponse {
	content: string;
	model: string;
	usage?: { promptTokens: number; completionTokens: number };
	provider: string;
	cost?: number;
}

export interface EmbeddingRequest {
	model: string;
	input: string | string[];
}

export interface EmbeddingResponse {
	embeddings: number[][];
	model: string;
	usage?: { promptTokens: number };
}

export interface CostEntry {
	model: string;
	provider: string;
	inputTokens: number;
	outputTokens: number;
	cost: number;
	timestamp: string;
	agentRole?: string;
}

export interface HealthStatus {
	provider: string;
	healthy: boolean;
	latencyMs: number;
	lastError?: string;
	circuitOpen: boolean;
	failureCount: number;
}
