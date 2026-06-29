# Cost Governance

## OpenRouter Pricing

### Free Tier
| Model | Context | Rate Limit |
|---|---|---|
| Nemotron Super | 32k | 50 req/min |
| Nemotron Nano | 8k | 100 req/min |

### Paid Tier
| Model | Context | Pricing |
|---|---|---|
| DeepSeek Coder | 128k | $0.14/M input, $0.28/M output |
| DeepSeek Chat | 128k | $0.14/M input, $0.28/M output |
| Nemotron Ultra | 128k | $0.50/M input, $1.50/M output |

## Cost Tracking

### Per-Request Logging
Every model invocation logs:
- Model used
- Input tokens
- Output tokens
- Total cost (calculated from model pricing)
- Agent ID
- Task ID
- Timestamp

### Session Totals
Costs are aggregated per session. The orchestrator tracks cumulative spend and enforces session-level limits.

### Daily Budgets
A configurable daily budget caps total spend across all sessions. When the budget is reached, further requests are queued or rejected with a notification.

## Cost Optimization

### Prefer Free Models
Agents default to free-tier models (Nemotron Super, Nemotron Nano). Paid models are invoked only when:
- The task exceeds free-tier context limits.
- The task requires capabilities not available in free models.
- Explicitly escalated by the orchestrator.

### Escalation Criteria
| Condition | Action |
|---|---|
| Task complexity high | Escalate to DeepSeek or Nemotron Ultra |
| Free-tier rate limited | Queue or escalate |
| Context window exceeded | Upgrade to 128k model |
| Quality threshold unmet | Retry with higher-tier model |

## Budget Alerts

### Daily Spend Limits
Configurable per-deployment. Alerts fire at 50%, 80%, and 100% of the daily budget.

### Per-Agent Budgets
Each agent role has an optional cost ceiling. When an agent approaches its budget, the orchestrator reroutes tasks to cheaper alternatives.

## Cost Reporting

### Summary by Model
Breakdown of total cost grouped by model name. Identifies which models consume the most budget.

### Summary by Agent
Cost attribution per agent role. Highlights expensive agents for optimization.

### Summary by Time Period
Cost trends over hourly, daily, and weekly windows. Used for forecasting and anomaly detection.

### Report Format
```json
{
  "period": "2026-06-24",
  "total_cost_usd": 12.45,
  "by_model": {
    "nemotron-super": 0.00,
    "deepseek-coder": 8.32,
    "nemotron-ultra": 4.13
  },
  "by_agent": {
    "orchestrator": 6.20,
    "code-analyst": 4.10,
    "writer": 2.15
  }
}
```
