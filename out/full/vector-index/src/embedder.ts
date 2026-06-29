import { ollamaClient } from "@eyegents/ollama-client";

export interface EmbedderConfig {
  model: string;
  batchSize: number;
}

export class Embedder {
  private model: string;
  private batchSize: number;

  constructor(config: EmbedderConfig) {
    this.model = config.model;
    this.batchSize = config.batchSize;
  }

  async embed(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      const response = await ollamaClient.embed({
        model: this.model,
        input: batch
      });
      results.push(...response.embeddings);
    }
    return results;
  }

  async embedSingle(text: string): Promise<number[]> {
    const response = await ollamaClient.embed({
      model: this.model,
      input: text
    });
    return response.embeddings[0];
  }

  async healthCheck(): Promise<boolean> {
    try {
      await ollamaClient.embed({ model: this.model, input: "test" });
      return true;
    } catch {
      return false;
    }
  }
}

export const embedder = new Embedder({
  model: process.env.EMBEDDING_MODEL || "bge-m3:latest",
  batchSize: parseInt(process.env.BATCH_SIZE || "32")
});