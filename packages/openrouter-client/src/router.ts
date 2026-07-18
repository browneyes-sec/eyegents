import type { AgentRoutingConfig, RoutesConfig } from "./types.js";
import { FREE_MODEL } from "@eyegents/shared-types";

const DEFAULT_CONFIG: RoutesConfig = {
	models: {
		"nemotron-super": {
			openrouterId: "nvidia/nemotron-3-super-120b-a12b:free",
			contextWindow: 1048576,
			maxOutput: 16384,
			costPerMillionInput: 0,
			costPerMillionOutput: 0,
			strengths: ["agent orchestration", "multi-step planning", "long context"],
			tier: "free",
			noLimit: false,
		},
		"nemotron-ultra": {
			openrouterId: "nvidia/nemotron-3-ultra-550b-a55b",
			contextWindow: 1048576,
			maxOutput: 16384,
			costPerMillionInput: 0.001,
			costPerMillionOutput: 0.003,
			strengths: [
				"complex reasoning",
				"security audits",
				"architecture review",
			],
			tier: "paid",
			noLimit: false,
		},
		"nemotron-nano": {
			openrouterId: "nvidia/nemotron-3-nano-30b-a3b:free",
			contextWindow: 262144,
			maxOutput: 16384,
			costPerMillionInput: 0,
			costPerMillionOutput: 0,
			strengths: ["lightweight tasks", "fast inference", "sub-agent work"],
			tier: "free",
			noLimit: false,
		},
		"deepseek-flash": {
			openrouterId: "deepseek/deepseek-v4-flash",
			contextWindow: 1048576,
			maxOutput: 16384,
			costPerMillionInput: 0.112,
			costPerMillionOutput: 0.224,
			strengths: ["fast coding", "code generation", "test writing"],
			tier: "paid",
			noLimit: false,
		},
		"deepseek-pro": {
			openrouterId: "deepseek/deepseek-v4-pro",
			contextWindow: 1048576,
			maxOutput: 16384,
			costPerMillionInput: 0.435,
			costPerMillionOutput: 0.87,
			strengths: ["complex reasoning", "architecture", "deep analysis"],
			tier: "paid",
			noLimit: false,
		},
		"qwen-coder": {
			openrouterId: "qwen/qwen3-coder:free",
			contextWindow: 1048576,
			maxOutput: 16384,
			costPerMillionInput: 0,
			costPerMillionOutput: 0,
			strengths: ["coding", "code generation", "refactoring", "no rate limit"],
			tier: "free",
			noLimit: true,
		},
		"deepseek-flash-free": {
			openrouterId: "deepseek/deepseek-v4-flash:free",
			contextWindow: 1048576,
			maxOutput: 16384,
			costPerMillionInput: 0,
			costPerMillionOutput: 0,
			strengths: ["long context", "economy fallback", "cost saving"],
			tier: "free",
			noLimit: true,
		},
		"openrouter-free": {
			openrouterId: "openrouter/free",
			contextWindow: 0,
			maxOutput: 0,
			costPerMillionInput: 0,
			costPerMillionOutput: 0,
			strengths: ["general fallback", "model routing"],
			tier: "free",
			noLimit: true,
		},
	},
	agentRoutes: {
		orchestrator: {
			simple: {
				model: "local",
				description: "Use local qwen2.5-coder:7b for simple tasks",
			},
			complex: {
				model: "nemotron-super",
				description: "Escalate to Nemotron 3 Super for complex tasks",
			},
			complexityThreshold: 2048,
			complexKeywords: [
				"decompose",
				"plan",
				"architecture",
				"refactor",
				"multi-step",
			],
		},
		backend: {
			primary: {
				model: "deepseek-flash",
				description: "DeepSeek V4 Flash for backend coding",
			},
			fallback: {
				model: "local",
				description: "Fall back to local qwen2.5-coder:7b",
			},
		},
		frontend: {
			primary: {
				model: "local",
				description: "Local qwen2.5-coder:7b for frontend tasks",
			},
			fallback: {
				model: "qwen-coder",
				description: "Qwen3 Coder (free) for complex frontend work",
			},
		},
		qa: {
			primary: {
				model: "deepseek-flash",
				description: "DeepSeek V4 Flash for test generation",
			},
			fallback: {
				model: "qwen-coder",
				description: "Qwen3 Coder (free) as economy fallback",
			},
		},
		ops: {
			primary: {
				model: "local",
				description: "Local qwen2.5-coder:7b for ops tasks",
			},
			fallback: {
				model: "qwen-coder",
				description: "Qwen3 Coder (free) for complex ops work",
			},
		},
		fullstack: {
			primary: {
				model: "deepseek-flash",
				description: "DeepSeek V4 Flash for full-stack features",
			},
			fallback: {
				model: "qwen-coder",
				description: "Qwen3 Coder (free) as economy fallback",
			},
		},
		certifier: {
			primary: {
				model: "nemotron-ultra",
				description: "Nemotron 3 Ultra for security audits",
			},
			fallback: {
				model: "deepseek-pro",
				description: "DeepSeek V4 Pro as secondary",
			},
		},
		aider: {
			primary: {
				model: "openrouter-free",
				description: "openrouter/free — free routing endpoint for cost-effective coding",
			},
			fallback: {
				model: "qwen-coder",
				description: "Qwen3 Coder (free) as reliable economy fallback",
			},
		},
	},
	localModels: {
		primary: "qwen2.5-coder:7b",
		small: "qwen2.5:0.5b",
		embedding: "bge-m3:latest",
	},
};

const COMPLEXITY_KEYWORDS = [
	"decompose",
	"plan",
	"architecture",
	"refactor",
	"multi-step",
	"break down",
	"coordinate",
	"orchestrate",
	"complex",
	"security audit",
	"compliance",
	"deep analysis",
	"review",
];

export class AgentRouter {
	private config: RoutesConfig;

	constructor(config?: RoutesConfig) {
		this.config = config || DEFAULT_CONFIG;
	}

	resolveModel(
		agentRole: string,
		taskComplexity?: "simple" | "complex",
		prompt?: string,
	): {
		modelId: string;
		openrouterId: string | null;
		isLocal: boolean;
		reason: string;
	} {
		const route = this.config.agentRoutes[agentRole];
		if (!route) {
			return this.getDefault();
		}

		const complexity = taskComplexity || this.detectComplexity(prompt || "");

		if (complexity === "complex" && route.complex) {
			return this.resolve(route.complex.model, `complex task for ${agentRole}`);
		}
		if (complexity === "simple" && route.simple) {
			return this.resolve(route.simple.model, `simple task for ${agentRole}`);
		}
		if (route.primary) {
			return this.resolve(
				route.primary.model,
				`primary model for ${agentRole}`,
			);
		}

		// If no route found, fallback to free model
		return this.resolve(FREE_MODEL, `free fallback for ${agentRole}`);
	}

	private resolve(
		modelRef: string,
		reason: string,
	): {
		modelId: string;
		openrouterId: string | null;
		isLocal: boolean;
		reason: string;
	} {
		if (modelRef === "local") {
			return {
				modelId: this.config.localModels.primary,
				openrouterId: null,
				isLocal: true,
				reason: `${reason} -> local`,
			};
		}

		const model = this.config.models[modelRef];
		if (model) {
			return {
				modelId: modelRef,
				openrouterId: model.openrouterId,
				isLocal: false,
				reason: `${reason} -> ${model.openrouterId}`,
			};
		}

		return this.getDefault();
	}

	private getDefault() {
		return {
			modelId: this.config.localModels.primary,
			openrouterId: null,
			isLocal: true,
			reason: "default fallback -> local",
		};
	}

	detectComplexity(prompt: string): "simple" | "complex" {
		const lower = prompt.toLowerCase();
		const hasKeyword = COMPLEXITY_KEYWORDS.some((kw) => lower.includes(kw));
		const isLong = prompt.length > 2048;
		return hasKeyword || isLong ? "complex" : "simple";
	}

	getModel(modelRef: string) {
		return this.config.models[modelRef];
	}

	listModels(): Array<{ ref: string; openrouterId: string; tier: string }> {
		return Object.entries(this.config.models).map(([ref, model]) => ({
			ref,
			openrouterId: model.openrouterId,
			tier: model.tier,
		}));
	}

	getConfig(): RoutesConfig {
		return this.config;
	}
}
