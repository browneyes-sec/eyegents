import type { AgentRoutingConfig, RoutesConfig } from "./types.js";

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
		},
		"nemotron-nano": {
			openrouterId: "nvidia/nemotron-3-nano-30b-a3b:free",
			contextWindow: 262144,
			maxOutput: 16384,
			costPerMillionInput: 0,
			costPerMillionOutput: 0,
			strengths: ["lightweight tasks", "fast inference", "sub-agent work"],
			tier: "free",
		},
		"deepseek-flash": {
			openrouterId: "deepseek/deepseek-v4-flash",
			contextWindow: 1048576,
			maxOutput: 16384,
			costPerMillionInput: 0.112,
			costPerMillionOutput: 0.224,
			strengths: ["fast coding", "code generation", "test writing"],
			tier: "paid",
		},
		"deepseek-pro": {
			openrouterId: "deepseek/deepseek-v4-pro",
			contextWindow: 1048576,
			maxOutput: 16384,
			costPerMillionInput: 0.435,
			costPerMillionOutput: 0.87,
			strengths: ["complex reasoning", "architecture", "deep analysis"],
			tier: "paid",
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
				model: "nemotron-super",
				description: "Escalate to Nemotron 3 Super if needed",
			},
		},
		qa: {
			primary: {
				model: "deepseek-flash",
				description: "DeepSeek V4 Flash for test generation",
			},
			fallback: {
				model: "local",
				description: "Fall back to local qwen2.5-coder:7b",
			},
		},
		ops: {
			primary: {
				model: "local",
				description: "Local qwen2.5-coder:7b for ops tasks",
			},
			fallback: {
				model: "nemotron-super",
				description: "Escalate to Nemotron 3 Super if needed",
			},
		},
		fullstack: {
			primary: {
				model: "deepseek-flash",
				description: "DeepSeek V4 Flash for full-stack features",
			},
			fallback: {
				model: "local",
				description: "Fall back to local qwen2.5-coder:7b",
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
				model: "nemotron-super",
				description: "Nemotron 3 Super for Aider coding tasks",
			},
			fallback: {
				model: "deepseek-flash",
				description: "DeepSeek V4 Flash as paid fallback",
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

		return this.getDefault();
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
