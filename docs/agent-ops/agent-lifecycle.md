# Agent Lifecycle

## Agent Creation

### Role Definition
Each agent is defined by a role profile specifying its domain, capabilities, and behavioral constraints. Roles are registered in the agent registry and referenced during routing.

```yaml
agent:
  name: "code-analyst"
  role: "static analysis, refactoring suggestions"
  capabilities: ["parse", "lint", "suggest"]
  constraints: ["no file writes", "read-only access"]
```

### Model Assignment
Agents are bound to models based on task complexity and cost tier. Free-tier models handle routine tasks; paid models are reserved for high-complexity work.

| Agent Role | Default Model | Fallback |
|---|---|---|
| Orchestrator | Nemotron Ultra | DeepSeek Coder |
| Code Analyst | Nemotron Super | Nemotron Nano |
| Writer | DeepSeek Chat | Nemotron Super |
| Reviewer | Nemotron Super | Nemotron Nano |

### Skill Loading
Skills are loaded from `~/.opencode/skills/` or project-level `.opencode/skills/`. Each skill declares required tools and trigger patterns. Agents are initialized with their assigned skills at creation time.

## Agent Routing

### Orchestrator Decomposition
The orchestrator agent receives a user query and decomposes it into sub-tasks. Each sub-task is matched to a specialist agent based on capability overlap and current availability.

```
User Query → Orchestrator → [Task A, Task B, Task C]
                              ↓         ↓         ↓
                          Agent-1   Agent-2   Agent-1
```

### Routing Decision Factors
- **Capability match**: Does the agent's role cover the task?
- **Cost efficiency**: Prefer free-tier agents when possible.
- **Load balancing**: Distribute across available agents.
- **Context locality**: Route to agents with relevant memory access.

## Agent Communication

### MCP Tool Calls
Agents communicate via Model Context Protocol (MCP) tool invocations. Each tool call specifies a target agent, tool name, and parameters.

```json
{
  "agent": "code-analyst",
  "tool": "analyze_file",
  "params": { "path": "src/main.py" }
}
```

### Message Passing
Agents exchange structured messages for coordination. Messages include a sender, recipient, payload, and optional priority flag. The orchestrator manages message routing between agents.

## Agent Retirement

### Supersession
When a new agent version or model upgrade is deployed, the old agent is marked as superseded. In-flight tasks are drained before decommissioning.

### Decommissioning
Agents are decommissioned when:
- Their role is no longer needed.
- A more cost-effective replacement exists.
- Their success rate drops below threshold.

Retired agents are removed from the routing table but their memory collections are preserved for archival.

## Agent Monitoring

### Metrics Tracked
| Metric | Description |
|---|---|
| Cost per agent | Total token cost attributed to the agent |
| Success rate | Percentage of tasks completed without error |
| Latency | Time from task assignment to result delivery |
| Memory usage | Tokens consumed from memory stores |

### Dashboards
Metrics are logged per-request and aggregated into session and daily summaries. Alerts trigger when cost or latency exceed configured thresholds.
