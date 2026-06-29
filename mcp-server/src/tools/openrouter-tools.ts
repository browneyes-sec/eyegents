import { z } from "zod";
import { OpenRouterClient } from "@eyegents/openrouter-client";

const client = new OpenRouterClient({
  apiKey: process.env.OPENROUTER_API_KEY,
  siteUrl: process.env.OPENROUTER_SITE_URL || "https://github.com/browneyes-sec/eyegents",
  siteTitle: process.env.OPENROUTER_SITE_TITLE || "eyegents",
  dailyBudget: 5.0
});

const completeSchema = z.object({
  prompt: z.string().describe("The user prompt or task description"),
  agentRole: z.enum(["orchestrator", "backend", "frontend", "qa", "ops", "fullstack", "certifier"])
    .describe("The agent role requesting completion"),
  taskComplexity: z.enum(["simple", "complex"]).optional()
    .describe("Override complexity detection (auto-detected if omitted)"),
  temperature: z.number().min(0).max(2).optional().default(0.7)
    .describe("Temperature for generation"),
  maxTokens: z.number().min(1).max(16384).optional().default(4096)
    .describe("Maximum tokens to generate")
});

const healthSchema = z.object({});

const modelsSchema = z.object({});

const costSchema = z.object({});

const routesSchema = z.object({});

export const openrouterTools = [
  {
    name: "openrouter_complete",
    description: "Complete a prompt using OpenRouter (Nemotron/DeepSeek). Routes to optimal model based on agent role and task complexity. Free models available for most tasks.",
    inputSchema: {
      type: "object" as const,
      properties: {
        prompt: { type: "string", description: "The user prompt or task description" },
        agentRole: {
          type: "string",
          enum: ["orchestrator", "backend", "frontend", "qa", "ops", "fullstack", "certifier"],
          description: "The agent role requesting completion"
        },
        taskComplexity: {
          type: "string",
          enum: ["simple", "complex"],
          description: "Override complexity detection (auto-detected if omitted)"
        },
        temperature: { type: "number", description: "Temperature (0-2, default 0.7)" },
        maxTokens: { type: "number", description: "Max tokens (1-16384, default 4096)" }
      },
      required: ["prompt", "agentRole"]
    },
    handler: async (args: Record<string, unknown>) => {
      const parsed = completeSchema.parse(args);
      const result = await client.complete({
        model: "auto",
        messages: [{ role: "user", content: parsed.prompt }],
        agentRole: parsed.agentRole,
        taskComplexity: parsed.taskComplexity,
        temperature: parsed.temperature,
        maxTokens: parsed.maxTokens
      });
      return {
        content: result.content,
        model: result.model,
        provider: result.provider,
        cost: result.cost,
        usage: result.usage
      };
    }
  },
  {
    name: "openrouter_health",
    description: "Check OpenRouter API health and connectivity status",
    inputSchema: { type: "object" as const, properties: {} },
    handler: async () => {
      const status = await client.healthCheck();
      return status;
    }
  },
  {
    name: "openrouter_models",
    description: "List available OpenRouter models and their routing configuration",
    inputSchema: { type: "object" as const, properties: {} },
    handler: () => {
      const router = client.getRouter();
      const models = router.listModels();
      return { models };
    }
  },
  {
    name: "openrouter_costs",
    description: "Get session cost summary and usage breakdown by model and agent",
    inputSchema: { type: "object" as const, properties: {} },
    handler: () => {
      const tracker = client.getCostTracker();
      return tracker.getSummary();
    }
  },
  {
    name: "openrouter_routes",
    description: "Show the agent-to-model routing configuration",
    inputSchema: { type: "object" as const, properties: {} },
    handler: () => {
      const router = client.getRouter();
      const config = router.getConfig();
      return {
        agentRoutes: config.agentRoutes,
        models: Object.entries(config.models).map(([ref, m]) => ({
          ref,
          openrouterId: m.openrouterId,
          tier: m.tier,
          contextWindow: m.contextWindow
        })),
        localModels: config.localModels
      };
    }
  }
];
