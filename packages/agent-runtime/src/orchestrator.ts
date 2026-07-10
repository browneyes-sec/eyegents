import {
  AgentRoleSchema,
  AgentMessageSchema,
  type AgentRole,
  type AgentMessage,
  type ContextPacket
} from "@eyegents/shared-types";
import { contextAssembler } from "@eyegents/context-engine";
import { mcpClient } from "@eyegents/mcp-client";
import { AiderAdapter } from "@eyegents/aider-adapter";

type RoutingKey = "backend" | "frontend" | "qa" | "ops" | "certifier" | "fullstack" | "aider";

const ROUTING_RULES: Record<RoutingKey, string[]> = {
  backend: ["api", "database", "server", "auth", "deploy", "k8s", "docker", "microservice", "grpc", "rest"],
  frontend: ["react", "vue", "component", "css", "ui", "ux", "state", "redux", "hook", "jsx", "tsx"],
  qa: ["test", "spec", "coverage", "lint", "benchmark", "e2e", "integration", "unit", "jest", "vitest", "playwright"],
  ops: ["deploy", "pipeline", "monitor", "logs", "terraform", "ansible", "ci", "cd", "infrastructure", "kubernetes"],
  certifier: ["security", "audit", "compliance", "vulnerability", "secrets", "gdpr", "hipaa", "pci"],
  fullstack: ["feature", "end-to-end", "full stack", "integration", "fullstack"],
  aider: ["code", "edit", "refactor", "implement", "pair-program", "aider", "ai coding"]
};

export class Orchestrator {
  async decompose(task: string): Promise<Array<{ role: AgentRole; description: string; criteria: string[] }>> {
    const context = await contextAssembler.assemble(task, 8000);

    const response = await mcpClient.callTool("skill_execute", {
      skillName: "task-decomposition",
      task,
      context: { contextPacket: context }
    });

    try {
      const text = response.content[0]?.text as string;
      return JSON.parse(text).subtasks;
    } catch {
      return this.fallbackDecompose(task, context);
    }
  }

  private fallbackDecompose(task: string, context: ContextPacket): Array<{ role: AgentRole; description: string; criteria: string[] }> {
    const roles = this.determineRoles(task);
    return roles.map(role => ({
      role,
      description: `${role} implementation for: ${task}`,
      criteria: this.getCriteria(role)
    }));
  }

  private determineRoles(task: string): AgentRole[] {
    const lower = task.toLowerCase();
    const matched = new Set<AgentRole>();

    for (const [role, keywords] of Object.entries(ROUTING_RULES)) {
      if (keywords.some(k => lower.includes(k))) {
        matched.add(role as AgentRole);
      }
    }

    if (matched.size === 0) matched.add("fullstack");
    if (!matched.has("certifier") && (lower.includes("security") || lower.includes("auth"))) {
      matched.add("certifier");
    }

    return Array.from(matched);
  }

  private getCriteria(role: AgentRole): string[] {
    const criteria: Record<AgentRole, string[]> = {
      orchestrator: ["Task decomposed", "All subtasks assigned", "Results synthesized"],
      backend: ["API endpoints implemented", "Database schema updated", "Tests passing", "Documentation updated"],
      frontend: ["Components created", "State management", "Responsive design", "Accessibility"],
      qa: ["Unit tests >80% coverage", "Integration tests", "E2E tests", "Performance benchmarks"],
      ops: ["CI/CD pipeline updated", "Monitoring configured", "Rollback plan", "Documentation"],
      fullstack: ["Backend + Frontend integrated", "E2E flow works", "Tests passing"],
      certifier: ["No secrets exposed", "AuthZ on all endpoints", "Input validation", "Dependency scan clean"],
      aider: ["Code edited", "Diff captured", "Lint/typecheck passing", "Decision logged"]
    };
    return criteria[role] || [];
  }

  async route(message: AgentMessage): Promise<AgentMessage> {
    return {
      ...message,
      payload: { ...message.payload, context: await contextAssembler.assemble(message.payload.description) }
    };
  }

  /**
   * Execute a routed agent task.
   *
   * For the `aider` agent, invokes AiderAdapter directly (host-side Python CLI).
   * For other agents, returns the message unchanged — execution is handled
   * externally via MCP tools or the OpenCode runtime.
   */
  async execute(message: AgentMessage): Promise<AgentMessage> {
    if (message.to !== "aider") {
      return message;
    }

    const adapter = new AiderAdapter();
    const result = await adapter.execute({
      task: message.payload.description,
      files: message.payload.artifacts?.map((a) => a.path) || [],
      sessionId: message.id,
      readOnly: false,
      autoCommit: false,
    });

    return {
      id: `${message.id}-result`,
      from: "aider" as AgentRole,
      to: message.from,
      type: "result",
      payload: {
        taskId: message.payload.taskId,
        description: message.payload.description,
        context: message.payload.context,
        acceptanceCriteria: message.payload.acceptanceCriteria,
        artifacts: (result.changedFiles || []).map((path) => ({
          type: "code",
          path,
          content: result.diff || "",
        })),
      },
      metadata: {
        timestamp: new Date().toISOString(),
        tokenBudget: message.metadata.tokenBudget,
        priority: message.metadata.priority,
      },
    };
  }

  async synthesize(results: AgentMessage[]): Promise<string> {
    const context = await contextAssembler.assemble(
      `Synthesize results from ${results.length} agents`,
      4000
    );

    const response = await mcpClient.callTool("skill_execute", {
      skillName: "synthesis",
      task: "Synthesize agent results into coherent response",
      context: { results: results.map(r => r.payload), contextPacket: context }
    });

    return (response.content[0]?.text as string) || "";
  }
}

export const orchestrator = new Orchestrator();