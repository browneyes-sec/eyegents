# Health Checks

Monitoring and health verification for all eyegents services.

---

## Service Health Commands

### Ollama

```bash
# List loaded models and their status
docker exec eyegents-ollama ollama ps

# Quick inference test
docker exec eyegents-ollama ollama run nomic-embed-text "test" --verbose

# Check Ollama API
curl http://localhost:11434/api/tags
```

### Qdrant

```bash
# Health endpoint
curl http://localhost:6333/health

# Collection info
curl http://localhost:6333/collections/eyegents

# Cluster status
curl http://localhost:6333/cluster
```

### MCP Server

```bash
# Health endpoint
curl http://localhost:3001/health

# List available tools
curl http://localhost:3001/tools

# Test a tool invocation
curl -X POST http://localhost:3001/tools/call \
  -H "Content-Type: application/json" \
  -d '{"name":"search","params":{"query":"test"}}'
```

### OpenRouter

```bash
# Run the test script
python scripts/openrouter-test.py

# Manual API check
curl https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer $OPENROUTER_API_KEY"
```

---

## Docker Healthchecks

Each service defines a healthcheck in `docker-compose.yml`:

| Service | Interval | Timeout | Retries | Start Period |
|---------|----------|---------|---------|--------------|
| Ollama | 30s | 10s | 3 | 30s |
| Qdrant | 15s | 5s | 3 | 15s |
| MCP Server | 20s | 5s | 3 | 10s |

**Key fields:**
- **interval** — Time between checks
- **timeout** — Max wait for a response
- **retries** — Consecutive failures before `Unhealthy`
- **start_period** — Grace window at startup (failures don't count)

Check health status:
```bash
docker inspect --format='{{.State.Health.Status}}' eyegents-ollama
docker inspect --format='{{.State.Health.Status}}' eyegents-qdrant
docker inspect --format='{{.State.Health.Status}}' eyegents-mcp-server
```

---

## Custom Health Monitoring Script

```bash
#!/usr/bin/env bash
# scripts/health-check.sh

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

check() {
  local name="$1" url="$2"
  if curl -sf "$url" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} $name"
  else
    echo -e "${RED}✗${NC} $name"
  fi
}

echo "=== Eyegents Health Check ==="
check "Ollama"        "http://localhost:11434/api/tags"
check "Qdrant"        "http://localhost:6333/health"
check "MCP Server"    "http://localhost:3001/health"
```

Run it:
```bash
chmod +x scripts/health-check.sh
./scripts/health-check.sh
```

---

## Automated Monitoring (Optional)

For continuous monitoring, add a cron job or systemd timer:

```bash
# Example crontab entry (check every 5 minutes)
*/5 * * * * /path/to/scripts/health-check.sh >> /var/log/eyegents-health.log 2>&1
```
