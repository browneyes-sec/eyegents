# Incident Response Guide

Procedures for handling failures and outages in the eyegents stack.

---

## Severity Levels

| Level | Name | Description | Response Time |
|-------|------|-------------|---------------|
| **P0** | Critical | Stack completely down, data loss | Immediate |
| **P1** | High | Major feature broken, no workaround | < 1 hour |
| **P2** | Medium | Degraded performance, workaround exists | < 4 hours |
| **P3** | Low | Minor issue, cosmetic, non-blocking | Next business day |

---

## Escalation Paths

```
P3 → Check runbook, fix when available
P2 → Runbook + attempt fix, notify team if unresolved in 2h
P1 → Immediate investigation, all hands on deck
P0 → Stop the bleeding first, root cause later
```

---

## Scenario Playbooks

### Ollama Out of Memory (OOM)

**Severity:** P1–P2

**Symptoms:**
- `docker inspect eyegents-ollama` shows `OOMKilled: true`
- Chat/embedding requests fail with connection errors

**Response:**
1. Reduce parallel inference: set `OLLAMA_NUM_PARALLEL=1` in `.env`
2. Switch to lower quantization: use `Q4_K_M` or `Q4_0` models
3. Restart: `docker compose restart ollama`
4. If persistent, unload unused models: `docker exec eyegents-ollama ollama rm <model>`

**Prevention:**
- Monitor RAM via `free -h`
- Keep `OLLAMA_MAX_LOADED_MODELS=1`
- Use the resource limits defined in `docker-compose.yml`

---

### Qdrant Unavailable

**Severity:** P1

**Symptoms:**
- MCP server logs: `Connection refused` to port 6333
- Vector search returns errors

**Response:**
1. Check Qdrant status: `docker compose ps qdrant`
2. Restart: `docker compose restart qdrant`
3. Check health: `curl http://localhost:6333/health`
4. If Qdrant data is corrupt, fall back to in-memory HNSWlib (if supported by MCP server config)

**Fallback (in-memory):**
- Set `QDRANT_URL=` (empty) in `.env` to trigger HNSWlib mode
- Note: data is not persisted across restarts in this mode

---

### OpenRouter Outage

**Severity:** P2

**Symptoms:**
- Errors calling external models via OpenRouter
- Chat completions fail for cloud models

**Response:**
1. Verify outage: `python scripts/openrouter-test.py`
2. Circuit breaker activates automatically after consecutive failures
3. Traffic routes to local Ollama models as fallback
4. Monitor until OpenRouter recovers; circuit breaker auto-resets

**No action required** if local fallback is working correctly.

---

### MCP Server Crash

**Severity:** P1

**Symptoms:**
- `docker compose ps` shows `mcp-server` as `Exited` or `Restarting`
- Tools endpoint unreachable

**Response:**
1. Check logs: `docker logs --tail 200 eyegents-mcp-server`
2. Restart: `docker compose restart mcp-server`
3. Verify health: `curl http://localhost:3001/health`
4. If crash-looping, check for OOM: `docker inspect eyegents-mcp-server | grep OOMKilled`

---

### Data Loss (Qdrant)

**Severity:** P0

**Symptoms:**
- Vector collections missing or empty
- Search returns zero results for known data

**Response:**
1. **Do not restart Qdrant** (may overwrite snapshot state)
2. Attempt snapshot restore:
   ```bash
   curl -X POST http://localhost:6333/snapshots/restore \
     -F "snapshot=@/path/to/snapshot.snapshot"
   ```
3. If no snapshot exists, trigger full re-index:
   ```bash
   docker compose --profile indexing up indexer
   ```
4. Review how data was lost and update backup procedures

**Prevention:**
- Schedule regular Qdrant snapshots
- Store snapshots off-host if possible
