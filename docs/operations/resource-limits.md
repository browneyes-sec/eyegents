# Resource Limits

Memory and CPU budgets for the eyegents stack.

---

## Default Allocation (3.5GB Host)

| Service | RAM | CPU | Notes |
|---------|-----|-----|-------|
| **Ollama** | 2.5GB | 3.0 | Main bottleneck; runs embedding + chat models |
| **Qdrant** | 1GB | 1.0 | Vector database |
| **MCP Server** | 512MB | 0.5 | FastAPI application |
| **Indexer** | 1GB | — | On-demand via `indexing` profile |
| **Total** | **5GB** | **4.5** | Exceeds host RAM — indexer runs separately |

The indexer uses the `indexing` profile so it does not run by default. When active, stop other services or accept swapping.

---

## Tuning for Different RAM Sizes

### 4GB Host

```yaml
# docker-compose.yml overrides
services:
  ollama:
    deploy:
      resources:
        limits:
          memory: 1.8G
          cpus: "2.0"

  qdrant:
    deploy:
      resources:
        limits:
          memory: 800M
          cpus: "1.0"

  mcp-server:
    deploy:
      resources:
        limits:
          memory: 384M
          cpus: "0.5"
```

`.env` adjustments:
```
OLLAMA_NUM_PARALLEL=1
OLLAMA_MAX_LOADED_MODELS=1
```

Use only one small model (e.g., `nomic-embed-text` + `llama3.2:1b`).

### 8GB Host

```yaml
services:
  ollama:
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: "4.0"

  qdrant:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: "2.0"

  mcp-server:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: "1.0"
```

`.env` adjustments:
```
OLLAMA_NUM_PARALLEL=2
OLLAMA_MAX_LOADED_MODELS=2
```

Supports 2 concurrent models (e.g., embedding + chat).

### 16GB Host

```yaml
services:
  ollama:
    deploy:
      resources:
        limits:
          memory: 8G
          cpus: "6.0"

  qdrant:
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: "2.0"

  mcp-server:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: "2.0"
```

`.env` adjustments:
```
OLLAMA_NUM_PARALLEL=4
OLLAMA_MAX_LOADED_MODELS=4
```

Can run larger models (7B–13B) and multiple concurrent workloads.

---

## GPU Acceleration

### Detection

```bash
# Check for NVIDIA GPU
./scripts/detect-gpu.sh
```

The script sets `OLLAMA_GPU_LAYERS` in `.env` based on available VRAM.

### Manual Configuration

```env
# .env — set layers to offload to GPU
OLLAMA_GPU_LAYERS=35    # Full offload for small models
OLLAMA_GPU_LAYERS=20    # Partial offload (saves VRAM)
OLLAMA_GPU_LAYERS=0     # CPU-only
```

### VRAM Guidelines

| VRAM | Recommended Layers | Model Size |
|------|-------------------|------------|
| 2GB | 20–30 | 3B Q4 |
| 4GB | 30–40 | 7B Q4 |
| 8GB | 40+ | 13B Q4 or 7B Q8 |
| 16GB+ | All | 13B+ Q8 |

### Verify GPU Usage

```bash
# Check if Ollama is using GPU
nvidia-smi

# Check Ollama server logs for GPU info
docker logs eyegents-ollama 2>&1 | grep -i gpu
```

---

## Monitoring Resource Usage

```bash
# Docker stats (live)
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Host memory
free -h

# Disk usage
docker system df
```
