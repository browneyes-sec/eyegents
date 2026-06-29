import type { CostEntry } from "./types.js";

interface ModelPricing {
	inputPerMillion: number;
	outputPerMillion: number;
}

const PRICING: Record<string, ModelPricing> = {
	"nvidia/nemotron-3-super-120b-a12b:free": {
		inputPerMillion: 0,
		outputPerMillion: 0,
	},
	"nvidia/nemotron-3-ultra-550b-a55b": {
		inputPerMillion: 0.001,
		outputPerMillion: 0.003,
	},
	"nvidia/nemotron-3-nano-30b-a3b:free": {
		inputPerMillion: 0,
		outputPerMillion: 0,
	},
	"deepseek/deepseek-v4-flash": {
		inputPerMillion: 0.112,
		outputPerMillion: 0.224,
	},
	"deepseek/deepseek-v4-pro": {
		inputPerMillion: 0.435,
		outputPerMillion: 0.87,
	},
	"qwen/qwen-2.5-coder-32b-instruct": {
		inputPerMillion: 0,
		outputPerMillion: 0,
	},
	"gpt-4o-mini": { inputPerMillion: 0.15, outputPerMillion: 0.6 },
	"claude-3-5-haiku-20241022": { inputPerMillion: 0.8, outputPerMillion: 4.0 },
};

export class CostTracker {
	private entries: CostEntry[] = [];
	private dailyBudget: number;
	private sessionTotal = 0;

	constructor(dailyBudgetUsd = 5.0) {
		this.dailyBudget = dailyBudgetUsd;
	}

	record(
		model: string,
		provider: string,
		inputTokens: number,
		outputTokens: number,
		agentRole?: string,
	): CostEntry {
		const pricing = PRICING[model] || {
			inputPerMillion: 0,
			outputPerMillion: 0,
		};
		const cost =
			(inputTokens * pricing.inputPerMillion +
				outputTokens * pricing.outputPerMillion) /
			1_000_000;

		const entry: CostEntry = {
			model,
			provider,
			inputTokens,
			outputTokens,
			cost,
			timestamp: new Date().toISOString(),
			agentRole,
		};

		this.entries.push(entry);
		this.sessionTotal += cost;
		return entry;
	}

	canAfford(estimatedTokens: number): boolean {
		const estimatedCost = (estimatedTokens * 0.5) / 1_000_000;
		return this.sessionTotal + estimatedCost <= this.dailyBudget;
	}

	getSessionTotal(): number {
		return this.sessionTotal;
	}

	getDailyBudget(): number {
		return this.dailyBudget;
	}

	getEntries(): CostEntry[] {
		return [...this.entries];
	}

	getSummary(): {
		totalCost: number;
		totalInputTokens: number;
		totalOutputTokens: number;
		byModel: Record<string, { cost: number; calls: number }>;
		byAgent: Record<string, { cost: number; calls: number }>;
	} {
		const byModel: Record<string, { cost: number; calls: number }> = {};
		const byAgent: Record<string, { cost: number; calls: number }> = {};
		let totalInput = 0;
		let totalOutput = 0;

		for (const entry of this.entries) {
			totalInput += entry.inputTokens;
			totalOutput += entry.outputTokens;

			if (!byModel[entry.model]) {
				byModel[entry.model] = { cost: 0, calls: 0 };
			}
			byModel[entry.model].cost += entry.cost;
			byModel[entry.model].calls++;

			const agent = entry.agentRole || "unknown";
			if (!byAgent[agent]) {
				byAgent[agent] = { cost: 0, calls: 0 };
			}
			byAgent[agent].cost += entry.cost;
			byAgent[agent].calls++;
		}

		return {
			totalCost: this.sessionTotal,
			totalInputTokens: totalInput,
			totalOutputTokens: totalOutput,
			byModel,
			byAgent,
		};
	}

	reset(): void {
		this.entries = [];
		this.sessionTotal = 0;
	}
}
