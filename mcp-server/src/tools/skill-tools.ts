import { z } from "zod";
import { retriever } from "@eyegents/vector-index";
import { qdrantClient } from "@eyegents/qdrant-client";

export const skillTools = [
  {
    name: "skill_execute",
    description: "Execute a skill workflow with context retrieval",
    inputSchema: z.object({
      skillName: z.string(),
      task: z.string(),
      context: z.record(z.unknown()).optional()
    }),
    handler: async (args: { skillName: string; task: string; context?: Record<string, any> }) => {
      const patterns = await retriever.searchSkillPatterns(args.skillName, args.task, 5);
      const skillContext = {
        patterns: patterns.map(p => p.payload),
        task: args.task,
        ...args.context
      };
      return { skillContext, patterns: patterns.length };
    }
  },
  {
    name: "skill_list",
    description: "List available skills",
    inputSchema: z.object({}),
    handler: async () => {
      const res = await qdrantClient.scroll("skill_patterns", 100);
      const skills = [...new Set(res.points.map(p => p.payload.skillName))];
      return { skills };
    }
  },
  {
    name: "skill_get_pattern",
    description: "Get specific skill pattern by ID",
    inputSchema: z.object({ id: z.string() }),
    handler: async (args: { id: string }) => {
      const res = await qdrantClient.scroll("skill_patterns", 1, undefined, { key: "id", match: { value: args.id } });
      return { pattern: res.points[0]?.payload };
    }
  }
];