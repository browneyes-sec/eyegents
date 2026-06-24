import { z } from "zod";
import { retriever } from "@eyegents/vector-index";
import { qdrantClient } from "@eyegents/qdrant-client";
import { ollamaClient } from "@eyegents/ollama-client";
import { VectorSearchRequestSchema, type VectorSearchRequest } from "@eyegents/shared-types";

export const vectorTools = [
  {
    name: "vector_search",
    description: "Hybrid semantic + keyword search across code, conversations, decisions, and skill patterns",
    inputSchema: VectorSearchRequestSchema,
    handler: async (args: Record<string, unknown>) => {
      const results = await retriever.search(args as VectorSearchRequest);
      return { results, count: results.length };
    }
  },
  {
    name: "vector_upsert",
    description: "Store code chunks, conversations, decisions, or skill patterns in vector database",
    inputSchema: z.object({
      type: z.enum(["code_chunk", "conversation", "decision", "skill_pattern"]),
      data: z.record(z.unknown()),
      embedding: z.array(z.number()).optional()
    }),
    handler: async (args: { type: string; data: any; embedding?: number[] }) => {
      const vector = args.embedding || await ollamaClient.embed({ model: "bge-m3:latest", input: JSON.stringify(args.data) }).then(r => r.embeddings[0]);
      switch (args.type) {
        case "code_chunk":
          await qdrantClient.upsertCodeChunk({ ...args.data, embedding: vector });
          break;
        case "conversation":
          await qdrantClient.upsertConversation({ ...args.data, embedding: vector });
          break;
        case "decision":
          await qdrantClient.upsertDecision({ ...args.data, embedding: vector });
          break;
        case "skill_pattern":
          await qdrantClient.upsertSkillPattern({ ...args.data, embedding: vector });
          break;
      }
      return { success: true };
    }
  },
  {
    name: "code_search",
    description: "Search codebase with language filtering",
    inputSchema: z.object({
      query: z.string(),
      languages: z.array(z.string()).optional(),
      limit: z.number().default(10)
    }),
    handler: async (args: { query: string; languages?: string[]; limit?: number }) => {
      const results = await retriever.searchCode(args.query, { languages: args.languages ?? [], limit: args.limit ?? 10 });
      return { results, count: results.length };
    }
  },
  {
    name: "decision_search",
    description: "Search architectural decisions",
    inputSchema: z.object({
      query: z.string(),
      limit: z.number().default(5)
    }),
    handler: async (args: { query: string; limit?: number }) => {
      const results = await retriever.searchDecisions(args.query, args.limit);
      return { results, count: results.length };
    }
  },
  {
    name: "skill_pattern_search",
    description: "Search skill patterns for few-shot examples",
    inputSchema: z.object({
      skillName: z.string(),
      query: z.string(),
      limit: z.number().default(3)
    }),
    handler: async (args: { skillName: string; query: string; limit?: number }) => {
      const results = await retriever.searchSkillPatterns(args.skillName, args.query, args.limit);
      return { results, count: results.length };
    }
  }
];