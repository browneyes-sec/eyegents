import {
  ModelConfigSchema,
  type ModelConfig,
  HealthStatusSchema,
  type HealthStatus
} from "@eyegents/shared-types";

export interface CompletionRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface CompletionResponse {
  content: string;
  model: string;
  usage?: { promptTokens: number; completionTokens: number };
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

type Provider = "ollama" | "opencode-zen" | "openrouter" | "openai" | "anthropic";

const FALLBACK_CHAIN: Provider[] = [
  "ollama",
  "opencode-zen",
  "openrouter",
  "openai",
  "anthropic"
];

const PROVIDER_CONFIG: Record<Provider, { baseURL: string; models: string[] }> = {
  ollama: { baseURL: process.env.OLLAMA_URL || "http://localhost:11434/v1", models: [] },
  "opencode-zen": { baseURL: "https://api.opencode.ai/v1", models: ["qwen-3-coder-480b"] },
  openrouter: { baseURL: "https://openrouter.ai/api/v1", models: ["qwen/qwen-2.5-coder-32b-instruct"] },
  openai: { baseURL: "https://api.openai.com/v1", models: ["gpt-4o-mini"] },
  anthropic: { baseURL: "https://api.anthropic.com/v1", models: ["claude-3-5-haiku-20241022"] }
};

class HealthMonitor {
  private status = new Map<Provider, HealthStatus>();
  private readonly CIRCUIT_THRESHOLD = 5;
  private readonly RECOVERY_TIMEOUT = 60000;

  async check(provider: Provider, apiKey?: string): Promise<HealthStatus> {
    const start = Date.now();
    const config = PROVIDER_CONFIG[provider];
    try {
      const res = await fetch(`${config.baseURL}/models`, {
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
        signal: AbortSignal.timeout(5000)
      });
      const healthy = res.ok;
      const result = {
        provider,
        healthy,
        latencyMs: Date.now() - start,
        circuitOpen: false,
        failureCount: healthy ? 0 : 1
      } satisfies HealthStatus;
      this.status.set(provider, result);
      return result;
    } catch (e) {
      const result = {
        provider,
        healthy: false,
        latencyMs: Date.now() - start,
        lastError: e instanceof Error ? e.message : String(e),
        circuitOpen: false,
        failureCount: 1
      } satisfies HealthStatus;
      this.status.set(provider, result);
      return result;
    }
  }

  shouldUse(provider: Provider): boolean {
    const status = this.status.get(provider);
    if (!status) return true;
    if (status.circuitOpen && Date.now() - (status as any).lastCheck > this.RECOVERY_TIMEOUT) {
      status.circuitOpen = false;
      return true;
    }
    return status.healthy && !status.circuitOpen;
  }

  recordFailure(provider: Provider): void {
    const status = this.status.get(provider);
    if (status) {
      status.failureCount++;
      if (status.failureCount >= this.CIRCUIT_THRESHOLD) {
        status.circuitOpen = true;
        (status as any).lastCheck = Date.now();
      }
    }
  }

  recordSuccess(provider: Provider): void {
    const status = this.status.get(provider);
    if (status) {
      status.failureCount = 0;
      status.circuitOpen = false;
    }
  }
}

export class OllamaClient {
  private baseURL: string;
  private apiKey?: string;
  private healthMonitor = new HealthMonitor();
  private currentProvider: Provider = "ollama";

  constructor(baseURL?: string, apiKey?: string) {
    this.baseURL = baseURL || process.env.OLLAMA_URL || "http://localhost:11434/v1";
    this.apiKey = apiKey;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    for (const provider of FALLBACK_CHAIN) {
      if (!this.healthMonitor.shouldUse(provider)) continue;

      try {
        const response = await this.request<CompletionResponse>(provider, "/chat/completions", {
          ...request,
          model: this.mapModel(provider, request.model)
        });
        this.healthMonitor.recordSuccess(provider);
        this.currentProvider = provider;
        return response;
      } catch (e) {
        this.healthMonitor.recordFailure(provider);
        if (!this.isRetryable(e)) throw e;
      }
    }
    throw new Error("All providers exhausted");
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    for (const provider of FALLBACK_CHAIN) {
      if (!this.healthMonitor.shouldUse(provider)) continue;

      try {
        const response = await this.request<EmbeddingResponse>(provider, "/embeddings", {
          ...request,
          model: this.mapModel(provider, request.model)
        });
        this.healthMonitor.recordSuccess(provider);
        return response;
      } catch (e) {
        this.healthMonitor.recordFailure(provider);
        if (!this.isRetryable(e)) throw e;
      }
    }
    throw new Error("All providers exhausted for embeddings");
  }

  async listModels(): Promise<ModelConfig[]> {
    const res = await fetch(`${this.baseURL}/models`, {
      headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}
    });
    if (!res.ok) throw new Error(`Failed to list models: ${res.statusText}`);
    const data = await res.json() as { data?: Array<{ id: string }> };
    return data.data?.map((m) => ({
      name: m.id,
      provider: "ollama",
      model: m.id
    })) || [];
  }

  async healthCheck(): Promise<HealthStatus> {
    return this.healthMonitor.check(this.currentProvider, this.apiKey);
  }

  private async request<T>(provider: Provider, path: string, body: any): Promise<T> {
    const config = PROVIDER_CONFIG[provider];
    const apiKey = this.getApiKey(provider);
    const res = await fetch(`${config.baseURL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`${provider} ${path}: ${res.status} ${err}`);
    }
    return (await res.json()) as T;
  }

  private mapModel(provider: Provider, model: string): string {
    if (provider === "ollama") return model;
    const config = PROVIDER_CONFIG[provider];
    return config.models[0] || model;
  }

  private getApiKey(provider: Provider): string | undefined {
    switch (provider) {
      case "opencode-zen": return process.env.OPENCODE_ZEN_API_KEY;
      case "openrouter": return process.env.OPENROUTER_API_KEY;
      case "openai": return process.env.OPENAI_API_KEY;
      case "anthropic": return process.env.ANTHROPIC_API_KEY;
      default: return this.apiKey;
    }
  }

  private isRetryable(error: unknown): boolean {
    const msg = error instanceof Error ? error.message : String(error);
    return msg.includes("OOM") ||
      msg.includes("timeout") ||
      msg.includes("unavailable") ||
      msg.includes("rate limit") ||
      msg.includes("503") ||
      msg.includes("502");
  }
}

export const ollamaClient = new OllamaClient();