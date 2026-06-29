import { VectorSearchRequestSchema, type VectorSearchRequest, type VectorSearchResult, type CodeChunk } from "@eyegents/shared-types";
import { qdrantClient } from "@eyegents/qdrant-client";
import { embedder } from "./embedder.js";

export interface RetrieverConfig {
  defaultLimit: number;
  hybridWeight: number;
}

const DEFAULT_CONFIG: RetrieverConfig = {
  defaultLimit: 10,
  hybridWeight: 0.7
};

export class Retriever {
  private config: RetrieverConfig;

  constructor(config: Partial<RetrieverConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async search(request: VectorSearchRequest): Promise<VectorSearchResult[]> {
    const { query, collection = "code_chunks", limit = this.config.defaultLimit, filters, hybrid = true } = request;

    if (hybrid) {
      const queryVector = await embedder.embedSingle(query);
      return this.hybridSearch(queryVector, query, collection, limit, filters);
    }

    return qdrantClient.search({
      query,
      collection,
      limit,
      filters,
      hybrid: false
    });
  }

  async hybridSearch(
    queryVector: number[],
    queryText: string,
    collection: string,
    limit: number,
    filters?: Record<string, any>
  ): Promise<VectorSearchResult[]> {
    const vectorResults = await qdrantClient.hybridSearch(queryVector, queryText, collection as any, limit, filters);
    const keywordResults = await this.keywordSearch(queryText, collection, limit, filters);

    return this.mergeResults(vectorResults, keywordResults, limit);
  }

  private async keywordSearch(
    query: string,
    collection: string,
    limit: number,
    filters?: Record<string, any>
  ): Promise<VectorSearchResult[]> {
    const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (keywords.length === 0) return [];

    const filter = this.buildKeywordFilter(keywords, filters);
    const res = await qdrantClient.scroll(collection as any, limit, undefined, filter);
    return res.points.map(p => ({
      id: p.id,
      score: 0.5,
      payload: p.payload
    }));
  }

  private buildKeywordFilter(keywords: string[], existingFilters?: Record<string, any>): any {
    const should = keywords.map(k => ({
      key: "content",
      match: { text: k }
    }));
    const must = existingFilters ? [this.buildFilter(existingFilters)] : [];
    return { should, must, min_should: 1 };
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

  private mergeResults(
    vectorResults: VectorSearchResult[],
    keywordResults: VectorSearchResult[],
    limit: number
  ): VectorSearchResult[] {
    const merged = new Map<string, VectorSearchResult>();

    for (const r of vectorResults) {
      merged.set(r.id, { ...r, score: r.score * this.config.hybridWeight });
    }

    for (const r of keywordResults) {
      const existing = merged.get(r.id);
      if (existing) {
        existing.score += r.score * (1 - this.config.hybridWeight);
      } else {
        merged.set(r.id, { ...r, score: r.score * (1 - this.config.hybridWeight) });
      }
    }

    return Array.from(merged.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async searchCode(query: string, options: { languages?: string[]; limit?: number } = {}): Promise<VectorSearchResult[]> {
    return this.search({
      query,
      collection: "code_chunks",
      limit: options.limit || this.config.defaultLimit,
      filters: options.languages ? { language: options.languages } : undefined,
      hybrid: true
    });
  }

  async searchDecisions(query: string, limit: number = 5): Promise<VectorSearchResult[]> {
    return this.search({
      query,
      collection: "decisions",
      limit,
      hybrid: true
    });
  }

  async searchConversations(query: string, sessionId?: string, limit: number = 5): Promise<VectorSearchResult[]> {
    return this.search({
      query,
      collection: "conversations",
      limit,
      filters: sessionId ? { sessionId } : undefined,
      hybrid: true
    });
  }

  async searchSkillPatterns(skillName: string, query: string, limit: number = 3): Promise<VectorSearchResult[]> {
    return this.search({
      query,
      collection: "skill_patterns",
      limit,
      filters: { skillName },
      hybrid: true
    });
  }
}

export const retriever = new Retriever();