import { Plugin } from "opencode";

export const vectorMemoryPlugin: Plugin = {
  name: "eyegents-vector-memory",
  version: "0.1.0",
  description: "Vector memory integration for OpenCode",

  async setup(opencode) {
    opencode.log.info("eyegents-vector-memory plugin loaded");

    opencode.tools.register("vector-remember", {
      description: "Store information in vector memory",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["code_chunk", "conversation", "decision", "skill_pattern"] },
          data: { type: "object" },
          tags: { type: "array", items: { type: "string" } }
        },
        required: ["type", "data"]
      },
      async execute({ type, data, tags }) {
        const { mcpClient } = await import("@eyegents/mcp-client");
        const { ollamaClient } = await import("@eyegents/ollama-client");

        const text = JSON.stringify(data);
        const embedding = await ollamaClient.embed({ model: "bge-m3:latest", input: text });

        await mcpClient.callTool("vector_upsert", {
          type,
          data: { ...data, tags },
          embedding: embedding.embeddings[0]
        });

        return { success: true };
      }
    });

    opencode.tools.register("vector-recall", {
      description: "Retrieve information from vector memory",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          collection: { type: "string", enum: ["code_chunks", "conversations", "decisions", "skill_patterns"] },
          limit: { type: "number", default: 5 }
        },
        required: ["query"]
      },
      async execute({ query, collection = "code_chunks", limit = 5 }) {
        const { mcpClient } = await import("@eyegents/mcp-client");
        const result = await mcpClient.callTool("vector_search", {
          query,
          collection,
          limit
        });
        return result;
      }
    });
  }
};

export default vectorMemoryPlugin;