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

type Provider = "ollama" | "opencode-zen" | "openrouter" | "openai" | "anthropic";

const FALLBACK_CHAIN: Provider[] = ["ollama", "opencode-zen", "openrouter", "openai", "anthropic"];

const PROVIDER_CONFIG: Record<Provider, { baseURL: string; models: string[] }> = {
  ollama: {
    baseURL: process.env.OLLAMA_URL || "http://localhost:11434/v1",
    models: [],
  },
  "opencode-zen": {
    baseURL: "https://api.opencode.ai/v1",
    models: ["qwen-3-coder-480b"],
  },
  openrouter: {
    baseURL: "https://openrouter.ai/api/v1",
    models: ["qwen/qwen-2.5-coder-32b-instruct"],
  },
  openai: { baseURL: "https://api.openai.com/v1", models: ["gpt-4o-mini"] },
  anthropic: {
    baseURL: "https://api.anthropic.com/v1",
    models: ["claude-3-5-haiku-20241022"],
  },
};

interface OpenAICompatCompletionResponse {
  choices: Array<{ message: { content: string } }>;
  model: string;
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
  private apiKey: string | undefined;
  private siteUrl: string | undefined;
  private siteTitle: string | undefined;

  constructor(options?: {
    apiKey?: string;
    dailyBudget?: number;
    siteUrl?: string;
    siteTitle?: string;
  }) {
    this.router = new AgentRouter();
    this.costTracker = new CostTracker(options?.dailyBudget || 5.0);

    this.apiKey = options?.apiKey || process.env.OPENROUTER_API_KEY;
    this.siteUrl = options?.siteUrl;
    this.siteTitle = options?.siteTitle;
  }

  private getApiKey(provider: Provider): string | undefined {
    switch (provider) {
      case "opencode-zen":
        return process.env.OPENCODE_ZEN_API_KEY;
      case "openrouter":
        return this.apiKey;
      case "openai":
        return process.env.OPENAI_API_KEY;
      case "anthropic":
        return process.env.ANTHROPIC_API_KEY;
      default:
        return undefined; // for ollama
    }
  }

  private mapModel(provider: Provider, model: string): string {
    if (provider === "ollama") return model;
    const config = PROVIDER_CONFIG[provider];
    return config.models[0] || model;
  }

  private isRetryable(error: unknown): boolean {
    const msg = error instanceof Error ? error.message : String(error);
    return (
      msg.includes("OOM") ||
      msg.includes("timeout") ||
      msg.includes("unavailable") ||
      msg.includes("rate limit") ||
      msg.includes("503") ||
      msg.includes("502")
    );
  }

  private async request<T>(provider: Provider, path: string, body: any): Promise<T> {
    const config = PROVIDER_CONFIG[provider];
    const apiKey = this.getApiKey(provider);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }
    if (provider === "openrouter") {
      if (this.siteUrl) {
        headers["HTTP-Referer"] = this.siteUrl;
      }
      if (this.siteTitle) {
        headers["X-Title"] = this.siteTitle;
      }
    }
    const res = await fetch(`${config.baseURL}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`${provider} ${path}: ${res.status} ${err}`);
    }
    return (await res.json()) as T;
  }

  private getOpenRouterProviderConfig() {
    return {
      baseURL: OPENROUTER_BASE,
      apiKey: this.apiKey,
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        ...(this.siteUrl ? { "HTTP-Referer": this.siteUrl } : {}),
        ...(this.siteTitle ? { "X-Title": this.siteTitle } : {}),
      },
    };
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    // If no API key is configured, force use of a free model
    const useFreeModel = !this.apiKey || request.model?.includes("free");

    for (const provider of FALLBACK_CHAIN) {
      let modelToUse: string;
      if (provider === "openrouter") {
        const resolution = this.router.resolveModel(
          request.agentRole || "orchestrator",
          request.taskComplexity,
          request.messages.map((m) => m.content).join(" "),
        );
        // Override with free model if needed
        if (useFreeModel) {
          modelToUse = "qwen/qwen3-coder:free";
        } else {
          modelToUse = resolution.openrouterId || request.model;
        }
      } else {
        modelToUse = this.mapModel(provider, request.model);
      }

      try {
        const raw = await this.request<OpenAICompatCompletionResponse>(
          provider,
          "/chat/completions",
          {
            model: modelToUse,
            messages: request.messages,
            temperature: request.temperature ?? 0.7,
            max_tokens: request.maxTokens ?? 4096,
            stream: request.stream ?? false,
          },
        );

        const content = raw.choices?.[0]?.message?.content || "";
        const inputTokens = raw.usage?.prompt_tokens || 0;
        const outputTokens = raw.usage?.completion_tokens || 0;

        let cost: number | undefined;
        if (provider === "openrouter") {
          const costEntry = this.costTracker.record(
            raw.model || modelToUse,
            "openrouter",
            inputTokens,
            outputTokens,
            request.agentRole,
          );
          cost = costEntry.cost;
        }

        return {
          content,
          model: raw.model || modelToUse,
          usage: {
            promptTokens: inputTokens,
            completionTokens: outputTokens,
          },
          provider,
          cost,
        };
      } catch (e) {
        if (!this.isRetryable(e)) {
          throw e;
        }
      }
    }
    throw new Error("All providers exhausted");
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const config = this.getOpenRouterProviderConfig();
    const res = await fetch(`${config.baseURL}/embeddings`, {
      method: "POST",
      headers: config.headers,
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
      usage: data.usage ? { promptTokens: data.usage.prompt_tokens } : undefined,
    };
  }

  async healthCheck(): Promise<HealthStatus> {
    const config = this.getOpenRouterProviderConfig();
    if (!config.apiKey) {
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
      const res = await fetch(`${config.baseURL}/models`, {
        headers: config.headers,
        signal: AbortSignal.timeout(5000),
      });

      return {
        provider: "openrouter",
        healthy: res.ok,
        latencyMs: Date.now() - start,
        circuitOpen: false,
        failureCount: 0,
      };
    } catch (e) {
      return {
        provider: "openrouter",
        healthy: false,
        latencyMs: Date.now() - start,
        lastError: e instanceof Error ? e.message : String(e),
        circuitOpen: false,
        failureCount: 1,
      };
    }
  }

  getRouter(): AgentRouter {
    return this.router;
  }

  getCostTracker(): CostTracker {
    return this.costTracker;
  }
}

export const openrouterClient = new OpenRouterClient();
