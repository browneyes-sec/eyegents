import { CostTracker } from "./cost-tracker.js";
import { AgentRouter } from "./router.js";
import type {
	CompletionRequest,
	CompletionResponse,
	EmbeddingRequest,
	EmbeddingResponse,
	HealthStatus,
} from "./types.js";

export type {
	CompletionRequest,
	CompletionResponse,
	EmbeddingRequest,
	EmbeddingResponse,
	HealthStatus,
};

interface ProviderConfig {
	baseURL: string;
	apiKey: string | undefined;
	headers: Record<string, string>;
}

interface ChatCompletionResponse {
	choices: Array<{ message: { content: string } }>;
	usage?: { prompt_tokens: number; completion_tokens: number };
}

interface EmbeddingResponseData {
	data: Array<{ embedding: number[] }>;
	usage?: { prompt_tokens: number };
}

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

export class OpenRouterClient {
	private router: AgentRouter;
	private costTracker: CostTracker;
	private providerConfig: ProviderConfig;
	private healthStatus: HealthStatus;
	private failureCount = 0;
	private readonly CIRCUIT_THRESHOLD = 5;
	private readonly RECOVERY_TIMEOUT = 60000;
	private lastFailure = 0;

	constructor(options?: {
		apiKey?: string;
		dailyBudget?: number;
		siteUrl?: string;
		siteTitle?: string;
	}) {
		this.router = new AgentRouter();
		this.costTracker = new CostTracker(options?.dailyBudget || 5.0);

		const apiKey = options?.apiKey || process.env.OPENROUTER_API_KEY;
		this.providerConfig = {
			baseURL: OPENROUTER_BASE,
			apiKey,
			headers: {
				"Content-Type": "application/json",
				...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
				...(options?.siteUrl ? { "HTTP-Referer": options.siteUrl } : {}),
				...(options?.siteTitle ? { "X-Title": options.siteTitle } : {}),
			},
		};

		this.healthStatus = {
			provider: "openrouter",
			healthy: !!apiKey,
			latencyMs: 0,
			circuitOpen: false,
			failureCount: 0,
		};
	}

	async complete(request: CompletionRequest): Promise<CompletionResponse> {
		if (this.healthStatus.circuitOpen) {
			if (Date.now() - this.lastFailure < this.RECOVERY_TIMEOUT) {
				throw new Error("OpenRouter circuit breaker is open. Try again later.");
			}
			this.healthStatus.circuitOpen = false;
		}

		const resolution = this.router.resolveModel(
			request.agentRole || "orchestrator",
			request.taskComplexity,
			request.messages.map((m) => m.content).join(" "),
		);

		const openrouterId = resolution.openrouterId || request.model;
		const agentRole = request.agentRole;

		const start = Date.now();
		try {
			const res = await fetch(
				`${this.providerConfig.baseURL}/chat/completions`,
				{
					method: "POST",
					headers: this.providerConfig.headers,
					body: JSON.stringify({
						model: openrouterId,
						messages: request.messages,
						temperature: request.temperature ?? 0.7,
						max_tokens: request.maxTokens ?? 4096,
						stream: request.stream ?? false,
					}),
					signal: AbortSignal.timeout(120000),
				},
			);

			if (!res.ok) {
				const errText = await res.text();
				throw new Error(`OpenRouter ${res.status}: ${errText}`);
			}

			const data = (await res.json()) as ChatCompletionResponse;
			const content = data.choices?.[0]?.message?.content || "";
			const usage = data.usage;

			const inputTokens = usage?.prompt_tokens || 0;
			const outputTokens = usage?.completion_tokens || 0;

			const costEntry = this.costTracker.record(
				openrouterId,
				"openrouter",
				inputTokens,
				outputTokens,
				agentRole,
			);

			this.recordSuccess();

			return {
				content,
				model: openrouterId,
				usage: {
					promptTokens: inputTokens,
					completionTokens: outputTokens,
				},
				provider: "openrouter",
				cost: costEntry.cost,
			};
		} catch (e) {
			this.recordFailure();
			throw e;
		}
	}

	async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
		const res = await fetch(`${this.providerConfig.baseURL}/embeddings`, {
			method: "POST",
			headers: this.providerConfig.headers,
			body: JSON.stringify({
				model: request.model,
				input: request.input,
			}),
			signal: AbortSignal.timeout(60000),
		});

		if (!res.ok) {
			const errText = await res.text();
			throw new Error(`OpenRouter embeddings ${res.status}: ${errText}`);
		}

		const data = (await res.json()) as EmbeddingResponseData;
		return {
			embeddings: data.data?.map((d) => d.embedding) || [],
			model: request.model,
			usage: data.usage
				? { promptTokens: data.usage.prompt_tokens }
				: undefined,
		};
	}

	async healthCheck(): Promise<HealthStatus> {
		if (!this.providerConfig.apiKey) {
			return {
				provider: "openrouter",
				healthy: false,
				latencyMs: 0,
				lastError: "No API key configured",
				circuitOpen: false,
				failureCount: 0,
			};
		}

		const start = Date.now();
		try {
			const res = await fetch(`${this.providerConfig.baseURL}/models`, {
				headers: this.providerConfig.headers,
				signal: AbortSignal.timeout(5000),
			});

			this.healthStatus = {
				provider: "openrouter",
				healthy: res.ok,
				latencyMs: Date.now() - start,
				circuitOpen: false,
				failureCount: 0,
			};
		} catch (e) {
			this.healthStatus = {
				provider: "openrouter",
				healthy: false,
				latencyMs: Date.now() - start,
				lastError: e instanceof Error ? e.message : String(e),
				circuitOpen: false,
				failureCount: 1,
			};
		}

		return this.healthStatus;
	}

	getRouter(): AgentRouter {
		return this.router;
	}

	getCostTracker(): CostTracker {
		return this.costTracker;
	}

	private recordSuccess(): void {
		this.failureCount = 0;
		this.healthStatus.healthy = true;
		this.healthStatus.circuitOpen = false;
		this.healthStatus.failureCount = 0;
	}

	private recordFailure(): void {
		this.failureCount++;
		this.lastFailure = Date.now();
		this.healthStatus.failureCount = this.failureCount;
		if (this.failureCount >= this.CIRCUIT_THRESHOLD) {
			this.healthStatus.circuitOpen = true;
		}
	}
}

export const openrouterClient = new OpenRouterClient();
