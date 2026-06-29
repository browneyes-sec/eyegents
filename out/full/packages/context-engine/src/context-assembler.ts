import {
  ContextPacketSchema,
  type ContextPacket,
  type CodeChunk,
  type Conversation,
  type Decision,
  type SkillPattern,
  type VectorSearchRequest
} from "@eyegents/shared-types";
import { retriever } from "@eyegents/vector-index";
import { qdrantClient } from "@eyegents/qdrant-client";

export interface AssemblerConfig {
  maxCodeChunks: number;
  maxGitCommits: number;
  maxDecisions: number;
  maxSkillPatterns: number;
  maxMemoryTurns: number;
  tokenBudget: number;
}

const DEFAULT_CONFIG: AssemblerConfig = {
  maxCodeChunks: 8,
  maxGitCommits: 10,
  maxDecisions: 5,
  maxSkillPatterns: 3,
  maxMemoryTurns: 8,
  tokenBudget: 24000
};

export class ContextAssembler {
  private config: AssemblerConfig;

  constructor(config: Partial<AssemblerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async assemble(query: string, budget?: number): Promise<ContextPacket> {
    const tokenBudget = budget || this.config.tokenBudget;

    const [codeChunks, gitHistory, decisions, skillPatterns, conversationMemory] = await Promise.all([
      this.getCodeChunks(query),
      this.getGitHistory(query),
      this.getDecisions(query),
      this.getSkillPatterns(query),
      this.getConversationMemory()
    ]);

    const packet = this.buildPacket(query, codeChunks, gitHistory, decisions, skillPatterns, conversationMemory, tokenBudget);
    return this.fitTokenBudget(packet, tokenBudget);
  }

  private async getCodeChunks(query: string): Promise<CodeChunk[]> {
    const results = await retriever.searchCode(query, { limit: this.config.maxCodeChunks });
    return results.map(r => ({
      id: r.id,
      filePath: r.payload.filePath as string,
      language: r.payload.language as string,
      astType: r.payload.astType as string,
      content: r.payload.content as string,
      startLine: r.payload.startLine as number,
      endLine: r.payload.endLine as number,
      createdAt: r.payload.createdAt as string,
      metadata: r.payload.metadata as Record<string, any>
    }));
  }

  private async getGitHistory(query: string): Promise<Array<{ hash: string; message: string; author: string; timestamp: string; files: string[] }>> {
    try {
      const { execSync } = await import("child_process");
      const log = execSync("git log --oneline -20 --pretty=format:'%H|%s|%an|%ad' --date=iso", { encoding: "utf-8" });
      return log.trim().split("\n").map(line => {
        const [hash, message, author, timestamp] = line.split("|");
        return { hash, message, author, timestamp, files: [] };
      }).slice(0, this.config.maxGitCommits);
    } catch {
      return [];
    }
  }

  private async getDecisions(query: string): Promise<Decision[]> {
    const results = await retriever.searchDecisions(query, this.config.maxDecisions);
    return results.map(r => ({
      id: r.id,
      context: r.payload.context as string,
      rationale: r.payload.rationale as string,
      outcome: r.payload.outcome as string,
      tags: r.payload.tags as string[],
      author: r.payload.author as any,
      status: r.payload.status as any,
      createdAt: r.payload.createdAt as string
    }));
  }

  private async getSkillPatterns(query: string): Promise<SkillPattern[]> {
    const skills = ["context-engineering", "vector-memory", "mcp-tools", "github-operations", "code-review", "testing-patterns", "security-audit"];
    const allPatterns: SkillPattern[] = [];

    for (const skill of skills) {
      const results = await retriever.searchSkillPatterns(skill, query, 2);
      for (const r of results) {
        allPatterns.push({
          id: r.id,
          skillName: r.payload.skillName as string,
          pattern: r.payload.pattern as string,
          example: r.payload.example as string,
          tags: r.payload.tags as string[],
          createdAt: r.payload.createdAt as string
        });
      }
    }
    return allPatterns.slice(0, this.config.maxSkillPatterns);
  }

  private async getConversationMemory(): Promise<Array<{ role: string; content: string; timestamp: string }>> {
    try {
      const res = await qdrantClient.scroll("conversations", this.config.maxMemoryTurns);
      const messages: Array<{ role: string; content: string; timestamp: string }> = [];
      for (const p of res.points) {
        const conv = p.payload as any;
        if (conv.messages) {
          messages.push(...conv.messages.slice(-2));
        }
      }
      return messages.slice(-this.config.maxMemoryTurns);
    } catch {
      return [];
    }
  }

  private buildPacket(
    query: string,
    codeChunks: CodeChunk[],
    gitHistory: any[],
    decisions: Decision[],
    skillPatterns: SkillPattern[],
    conversationMemory: any[],
    tokenBudget: number
  ): ContextPacket {
    return {
      query,
      codeChunks,
      gitHistory,
      decisions,
      skillPatterns,
      conversationMemory,
      tokenBudget,
      metadata: {
        assembledAt: new Date().toISOString(),
        sources: ["vector_search", "git_log", "vector_decisions", "vector_skills", "memory"],
        totalTokens: this.estimateTokens(JSON.stringify({ codeChunks, gitHistory, decisions, skillPatterns, conversationMemory }))
      }
    };
  }

  private fitTokenBudget(packet: ContextPacket, budget: number): ContextPacket {
    let currentTokens = this.estimateTokens(JSON.stringify(packet));
    if (currentTokens <= budget) return packet;

    const ratio = budget / currentTokens;
    const scale = (arr: any[], max: number) => arr.slice(0, Math.max(1, Math.floor(arr.length * ratio)));

    return {
      ...packet,
      codeChunks: scale(packet.codeChunks, this.config.maxCodeChunks),
      gitHistory: scale(packet.gitHistory, this.config.maxGitCommits),
      decisions: scale(packet.decisions, this.config.maxDecisions),
      skillPatterns: scale(packet.skillPatterns, this.config.maxSkillPatterns),
      conversationMemory: scale(packet.conversationMemory, this.config.maxMemoryTurns),
      metadata: { ...packet.metadata, totalTokens: budget }
    };
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 3.5);
  }
}

export const contextAssembler = new ContextAssembler();