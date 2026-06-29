# Operational Runbook

Quick-reference guide for day-to-day operations of the eyegents stack.

---

## Service Lifecycle

### Startup

```bash
# Full stack (recommended)
./scripts/bootstrap.sh

# Or via Docker Compose directly
docker compose up -d
```

`bootstrap.sh` handles:
- Pre-flight checks (Docker, disk space)
- Model pre-pulling
- Health-check waits
- Indexer profile if needed

### Shutdown

```bash
docker compose down
```

Add `-v` to remove volumes (destroys Qdrant data — use with caution).

### Restart a Single Service

```bash
docker compose restart <service>
# e.g.
docker compose restart ollama
docker compose restart mcp-server
```

### Stop a Single Service

```bash
docker compose stop <service>
```

---

## Log Collection

```bash
# All services
docker compose logs -f

# Single service
docker logs -f eyegents-ollama
docker logs -f eyegents-qdrant
docker logs -f eyegents-mcp-server

# Last 100 lines
docker logs --tail 100 eyegents-ollama
```

---

## Model Management

```bash
# List loaded models
docker exec eyegents-ollama ollama ps

# Pull a model
docker exec eyegents-ollama ollama pull <model>

# Remove a model
docker exec eyegents-ollama ollama rm <model>

# Common models used by eyegents
docker exec eyegents-ollama ollama pull nomic-embed-text
docker exec eyegents-ollama ollama pull llama3.2:3b
```

---

## Vector Index Rebuild

```bash
# Run the indexer (on-demand profile)
docker compose --profile indexing up indexer
```

This rebuilds the Qdrant collection from scratch. Useful after:
- Schema changes
- Data corruption
- Initial setup

---

## Common Issues and Fixes

### Out of Memory (OOM)

**Symptoms:** Container restarts, `docker inspect` shows `OOMKilled`.

**Fixes:**
- Reduce `OLLAMA_NUM_PARALLEL` in `.env`
- Use smaller quantization models (Q4 instead of Q8)
- Lower Qdrant `ON_DISK_PAYLOAD` threshold
- Check host RAM usage: `free -h`

### Connection Refused

**Symptoms:** `mcp-server` logs show `ECONNREFUSED` to Qdrant or Ollama.

**Fixes:**
```bash
# Check if services are running
docker compose ps

# Check health status
docker inspect --format='{{.State.Health.Status}}' eyegents-qdrant
docker inspect --format='{{.State.Health.Status}}' eyegents-ollama

# Restart the affected service
docker compose restart ollama   # or qdrant
```

### Model Not Found

**Symptoms:** `404` or "model not found" errors from Ollama.

**Fixes:**
```bash
# List available models
docker exec eyegents-ollama ollama list

# Pull the missing model
docker exec eyegents-ollama ollama pull <model-name>

# Verify .env has correct EMBEDDING_MODEL and CHAT_MODEL
grep -E 'EMBEDDING_MODEL|CHAT_MODEL' .env
```

### Indexer Fails to Start

**Symptoms:** `eyegents-indexer` exits immediately.

**Fixes:**
- Ensure Qdrant is healthy: `docker compose ps qdrant`
- Check indexer logs: `docker logs eyegents-indexer`
- Verify the source data directory is mounted correctly

### Slow Inference

**Symptoms:** High latency on chat requests.

**Fixes:**
- Check Ollama GPU usage: `nvidia-smi` (if GPU available)
- Reduce `OLLAMA_NUM_PARALLEL` to free VRAM
- Switch to a smaller model
- Ensure the model is loaded (not cold-starting): `docker exec eyegents-ollama ollama ps`
