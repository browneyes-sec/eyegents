import { ConversationSchema, type Conversation } from "@eyegents/shared-types";
import { qdrantClient } from "@eyegents/qdrant-client";
import { ollamaClient } from "@eyegents/ollama-client";

export class MemoryManager {
  async storeConversation(conversation: Conversation): Promise<void> {
    const text = JSON.stringify(conversation);
    const embedding = await ollamaClient.embed({ model: "bge-m3:latest", input: text });
    await qdrantClient.upsertConversation({ ...conversation, embedding: embedding.embeddings[0] });
  }

  async getConversation(sessionId: string): Promise<Conversation | null> {
    const res = await qdrantClient.scroll("conversations", 1, undefined, { key: "sessionId", match: { value: sessionId } });
    return res.points[0]?.payload as Conversation || null;
  }

  async getRecentConversations(limit: number = 10): Promise<Conversation[]> {
    const res = await qdrantClient.scroll("conversations", limit);
    return res.points.map(p => p.payload as Conversation);
  }

  async addMessage(sessionId: string, role: string, content: string, agentRole?: string): Promise<void> {
    let conv = await this.getConversation(sessionId);
    if (!conv) {
      conv = {
        id: sessionId,
        sessionId,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
    conv.messages.push({ role: role as any, content, timestamp: new Date().toISOString(), agentRole: agentRole as any });
    conv.updatedAt = new Date().toISOString();
    await this.storeConversation(conv);
  }

  async addDecision(sessionId: string, decisionId: string): Promise<void> {
    const conv = await this.getConversation(sessionId);
    if (conv) {
      conv.decisions = conv.decisions || [];
      conv.decisions.push(decisionId);
      await this.storeConversation(conv);
    }
  }

  async summarizeConversation(sessionId: string): Promise<string> {
    const conv = await this.getConversation(sessionId);
    if (!conv) return "";

    const text = conv.messages.map(m => `${m.role}: ${m.content}`).join("\n");
    const response = await ollamaClient.complete({
      model: "qwen2.5:0.5b",
      messages: [
        { role: "system", content: "Summarize this conversation in 2-3 sentences focusing on decisions and outcomes." },
        { role: "user", content: text }
      ],
      maxTokens: 200
    });
    return response.content;
  }
}

export const memoryManager = new MemoryManager();