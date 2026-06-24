import { CodeChunkSchema, type CodeChunk } from "@eyegents/shared-types";
import { qdrantClient } from "@eyegents/qdrant-client";
import { embedder } from "./embedder.js";
import { chunker, type ChunkOptions } from "./chunker.js";
import { readFileSync, statSync } from "fs";
import { globSync } from "fast-glob";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "../../..");

export interface IndexerConfig {
  watchMode: boolean;
  chunkMaxTokens: number;
  chunkOverlap: number;
  batchSize: number;
  includePatterns: string[];
  excludePatterns: string[];
}

const DEFAULT_CONFIG: IndexerConfig = {
  watchMode: process.env.WATCH_MODE === "true",
  chunkMaxTokens: parseInt(process.env.CHUNK_MAX_TOKENS || "512"),
  chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || "50"),
  batchSize: parseInt(process.env.BATCH_SIZE || "32"),
  includePatterns: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.py", "**/*.go", "**/*.rs"],
  excludePatterns: ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.git/**", "**/coverage/**", "**/*.test.ts", "**/*.spec.ts"]
};

export class CodeIndexer {
  private config: IndexerConfig;

  constructor(config: Partial<IndexerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private isIgnored(filePath: string): boolean {
    const relativePath = filePath.replace(ROOT + "/", "");
    for (const pattern of this.config.excludePatterns) {
      if (this.matchPattern(relativePath, pattern)) {
        return true;
      }
    }
    return false;
  }

  private matchPattern(filePath: string, pattern: string): boolean {
    // Simple glob matching for common patterns
    const regexPattern = pattern
      .replace(/\*\*/g, ".*")
      .replace(/\*/g, "[^/]*")
      .replace(/\?/g, "[^/]");
    return new RegExp(`^${regexPattern}$`).test(filePath);
  }

  async index(): Promise<{ indexed: number; errors: number }> {
    await qdrantClient.ensureCollections();

    const files = this.findFiles();
    console.log(`📁 Found ${files.length} files to index`);

    let indexed = 0;
    let errors = 0;

    for (const file of files) {
      try {
        await this.indexFile(file);
        indexed++;
        if (indexed % 50 === 0) console.log(`  → Indexed ${indexed}/${files.length} files`);
      } catch (e) {
        console.error(`  ❌ Failed to index ${file}:`, e);
        errors++;
      }
    }

    console.log(`✅ Indexing complete: ${indexed} files, ${errors} errors`);
    return { indexed, errors };
  }

  async indexFile(filePath: string): Promise<void> {
    const relativePath = filePath.replace(ROOT + "/", "");
    const content = readFileSync(filePath, "utf-8");
    if (!content.trim()) return;

    const chunks = chunker.chunk(content, relativePath, {
      maxTokens: this.config.chunkMaxTokens,
      overlap: this.config.chunkOverlap,
      language: this.detectLanguage(filePath)
    });

    if (chunks.length === 0) return;

    const texts = chunks.map(c => c.content);
    const embeddings = await embedder.embed(texts);

    const points = chunks.map((chunk, i) => ({
      ...chunk,
      embedding: embeddings[i]
    }));

    for (const point of points) {
      await qdrantClient.upsertCodeChunk(point);
    }
  }

  async reindexFile(filePath: string): Promise<void> {
    const relativePath = filePath.replace(ROOT + "/", "");
    await qdrantClient.delete("code_chunks", [relativePath]);
    await this.indexFile(filePath);
  }

  private findFiles(): string[] {
    const files: string[] = [];
    for (const pattern of this.config.includePatterns) {
      const matches = globSync(pattern, {
        cwd: ROOT,
        absolute: true,
        ignore: this.config.excludePatterns
      });
      files.push(...matches);
    }
    return [...new Set(files)].filter(f => !this.isIgnored(f));
  }

  private detectLanguage(filePath: string): string {
    const ext = filePath.split(".").pop()?.toLowerCase();
    const map: Record<string, string> = {
      ts: "typescript", tsx: "tsx", js: "typescript", jsx: "tsx",
      py: "python", go: "go", rs: "rust"
    };
    return map[ext || ""] || "typescript";
  }
}

export const indexer = new CodeIndexer();

async function main() {
  const start = Date.now();
  await indexer.index();
  console.log(`⏱️  Completed in ${((Date.now() - start) / 1000).toFixed(1)}s`);
}

main().catch(console.error);