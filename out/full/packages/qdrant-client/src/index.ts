import {
  VectorSearchRequestSchema,
  VectorSearchResultSchema,
  CodeChunkSchema,
  ConversationSchema,
  DecisionSchema,
  SkillPatternSchema,
  type VectorSearchRequest,
  type VectorSearchResult,
  type CodeChunk,
  type Conversation,
  type Decision,
  type SkillPattern
} from "@eyegents/shared-types";

export interface QdrantConfig {
  url: string;
  apiKey?: string;
}

const COLLECTIONS = {
  code_chunks: "code_chunks",
  conversations: "conversations",
  decisions: "decisions",
  skill_patterns: "skill_patterns"
} as const;

type CollectionName = keyof typeof COLLECTIONS;

export class QdrantClient {
  private url: string;
  private apiKey?: string;

  constructor(config: QdrantConfig) {
    this.url = config.url.replace(/\/$/, "");
    this.apiKey = config.apiKey;
  }

  private async request<T>(options: { method: string; path: string; body?: any }): Promise<T> {
    const res = await fetch(`${this.url}${options.path}`, {
      method: options.method,
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey ? { "api-key": this.apiKey } : {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Qdrant ${options.method} ${options.path}: ${res.status} ${err}`);
    }
    return res.json() as Promise<T>;
  }

  async ensureCollections(): Promise<void> {
    const collections = await this.request<{ collections: Array<{ name: string }> }>({
      method: "GET",
      path: "/collections"
    });
    const existing = new Set(collections.collections.map(c => c.name));

    for (const [, name] of Object.entries(COLLECTIONS)) {
      if (!existing.has(name)) {
        await this.createCollection(name);
      }
    }
  }

  private async createCollection(name: string): Promise<void> {
    const vectorSize = name === "code_chunks" ? 1024 : 1024;
    await this.request({
      method: "PUT",
      path: `/collections/${name}`,
      body: {
        vectors: { size: vectorSize, distance: "Cosine" },
        optimizers_config: { default_segment_number: 2 },
        hnsw_config: { m: 16, ef_construct: 100 }
      }
    });
  }

  async upsert(collection: CollectionName, points: Array<{ id: string; vector: number[]; payload: any }>): Promise<void> {
    await this.request({
      method: "PUT",
      path: `/collections/${COLLECTIONS[collection]}/points`,
      body: { points }
    });
  }

  async search(request: VectorSearchRequest): Promise<VectorSearchResult[]> {
    const collection = request.collection || "code_chunks";
    const body: any = {
      vector: request.query, // Will be replaced by embedder
      limit: request.limit,
      with_payload: true,
      with_vector: false
    };
    if (request.filters) body.filter = this.buildFilter(request.filters);
    const res = await this.request<{ result: VectorSearchResult[] }>({
      method: "POST",
      path: `/collections/${COLLECTIONS[collection]}/points/search`,
      body
    });
    return res.result;
  }

  async hybridSearch(
    queryVector: number[],
    queryText: string,
    collection: CollectionName,
    limit: number = 10,
    filters?: Record<string, any>
  ): Promise<VectorSearchResult[]> {
    const body: any = {
      vector: queryVector,
      limit: limit * 2,
      with_payload: true,
      with_vector: false
    };
    if (filters) body.filter = this.buildFilter(filters);
    const res = await this.request<{ result: VectorSearchResult[] }>({
      method: "POST",
      path: `/collections/${COLLECTIONS[collection]}/points/search`,
      body
    });
    return res.result.slice(0, limit);
  }

  async scroll(
    collection: CollectionName,
    limit: number = 100,
    offset?: number,
    filter?: Record<string, any>
  ): Promise<{ points: Array<{ id: string; payload: any; vector?: number[] }>; next_page_offset?: number }> {
    const body: any = { limit, with_payload: true, with_vector: false };
    if (offset) body.offset = offset;
    if (filter) body.filter = this.buildFilter(filter);
    return this.request({
      method: "POST",
      path: `/collections/${COLLECTIONS[collection]}/points/scroll`,
      body
    });
  }

  async delete(collection: CollectionName, ids: string[]): Promise<void> {
    await this.request({
      method: "POST",
      path: `/collections/${COLLECTIONS[collection]}/points/delete`,
      body: { points: ids }
    });
  }

  async getCollectionInfo(collection: CollectionName): Promise<any> {
    return this.request({
      method: "GET",
      path: `/collections/${COLLECTIONS[collection]}`
    });
  }

  private buildFilter(filters: Record<string, any>): any {
    const must: any[] = [];
    for (const [key, value] of Object.entries(filters)) {
      if (Array.isArray(value)) {
        must.push({ key, match: { any: value } });
      } else {
        must.push({ key, match: { value } });
      }
    }
    return { must };
  }

  async upsertCodeChunk(chunk: CodeChunk & { embedding: number[] }): Promise<void> {
    await this.upsert("code_chunks", [{
      id: chunk.id,
      vector: chunk.embedding,
      payload: {
        filePath: chunk.filePath,
        language: chunk.language,
        astType: chunk.astType,
        content: chunk.content,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        createdAt: chunk.createdAt,
        metadata: chunk.metadata
      }
    }]);
  }

  async upsertConversation(conv: Conversation & { embedding: number[] }): Promise<void> {
    await this.upsert("conversations", [{
      id: conv.id,
      vector: conv.embedding,
      payload: {
        sessionId: conv.sessionId,
        messages: conv.messages,
        summary: conv.summary,
        decisions: conv.decisions,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt
      }
    }]);
  }

  async upsertDecision(decision: Decision & { embedding: number[] }): Promise<void> {
    await this.upsert("decisions", [{
      id: decision.id,
      vector: decision.embedding,
      payload: {
        context: decision.context,
        rationale: decision.rationale,
        outcome: decision.outcome,
        tags: decision.tags,
        author: decision.author,
        status: decision.status,
        createdAt: decision.createdAt
      }
    }]);
  }

  async upsertSkillPattern(pattern: SkillPattern & { embedding: number[] }): Promise<void> {
    await this.upsert("skill_patterns", [{
      id: pattern.id,
      vector: pattern.embedding,
      payload: {
        skillName: pattern.skillName,
        pattern: pattern.pattern,
        example: pattern.example,
        tags: pattern.tags,
        createdAt: pattern.createdAt
      }
    }]);
  }
}

export const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL || "http://localhost:6333",
  apiKey: process.env.QDRANT_API_KEY
});