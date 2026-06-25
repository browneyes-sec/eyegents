# Container Security

## Image Base

### node:20-alpine
- **Base image**: `node:20-alpine` (official)
- **Size**: ~50MB (minimal attack surface)
- **Packages**: Only essential runtime dependencies
- **Updates**: Weekly rebuilds for security patches

### Why Alpine?
- **Minimal footprint**: Reduced vulnerability surface
- **Fast builds**: Smaller images = faster CI/CD
- **Security-focused**: musl libc, hardened kernel
- **Package manager**: apk for minimal dependencies

## Non-Root Execution

### Container User
```dockerfile
# Dockerfile example
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
```

### Implementation
- All services run as non-root where possible
- Ollama: Uses built-in non-root user
- Qdrant: Runs as `qdrant` user (UID 1000)
- MCP Server: Custom non-root user
- Indexer: Temporary container, non-root

### Benefits
- **Reduced privilege**: Limits container escape impact
- **Filesystem protection**: Cannot modify system files
- **Process isolation**: Cannot ptrace other processes

## Read-Only Filesystem

### Workspace Mount
```yaml
services:
  indexer:
    volumes:
      - /path/to/workspace:/workspace:ro
```

### Implementation
- Indexer container mounts workspace read-only
- Only `/tmp` and specific output directories are writable
- Prevents accidental or malicious code modification

### Benefits
- **Immutable code**: Prevents runtime modifications
- **Audit trail**: Changes require explicit volume mounts
- **Container integrity**: Base image remains unmodified

## Resource Limits

### CPU and Memory
| Service | CPU Limit | Memory Limit | Notes |
|---------|-----------|--------------|-------|
| Ollama | 3.0 | 2.5GB | Primary inference |
| Qdrant | 1.0 | 1GB | Vector storage |
| MCP Server | 0.5 | 512MB | Tool execution |
| Indexer | 1.0 | 1GB | On-demand only |

### Docker Compose Configuration
```yaml
services:
  ollama:
    deploy:
      resources:
        limits:
          cpus: '3.0'
          memory: 2560M
        reservations:
          cpus: '1.0'
          memory: 1024M
```

### Benefits
- **Prevents DoS**: Limits resource consumption
- **Fair scheduling**: Ensures all services get resources
- **Predictable performance**: No single service dominates

## Network Isolation

### Custom Network
```yaml
networks:
  eyegents-net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### Implementation
- All services attached to `eyegents-net`
- No host network access (except port mapping)
- Inter-service communication only via Docker DNS
- External access limited to exposed ports

### Network Policies
- **Egress**: Restricted to known endpoints
- **Ingress**: Only required ports exposed
- **DNS**: Internal resolution only
- **TLS**: Required for external connections

## No Secrets in Images

### Runtime Injection
```yaml
services:
  mcp-server:
    environment:
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
    env_file:
      - .env
```

### Implementation
- Secrets passed via environment variables at runtime
- Never baked into Docker images
- `.env` file excluded from image builds
- Build args cannot contain secrets

### Verification
```bash
# Scan image for secrets
trivy image eyegents/mcp-server:latest --severity HIGH,CRITICAL

# Check image layers
docker history eyegents/mcp-server:latest --no-trunc
```

## Health Checks

### Automated Restart
```yaml
services:
  ollama:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:11434/api/version"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: unless-stopped
```

### Benefits
- **Self-healing**: Automatic restart on failure
- **Monitoring**: Health status visible in Docker
- **Graceful degradation**: Failed containers don't cascade

### Implementation
- **Interval**: 30 seconds between checks
- **Timeout**: 10 seconds max per check
- **Retries**: 3 failures before restart
- **Start period**: 40 seconds for initialization

## Additional Security Controls

### Capability Dropping
```dockerfile
# Drop all capabilities, add only required ones
RUN setcap -r /usr/bin/curl || true
```

### Seccomp Profiles
- Use default Docker seccomp profile
- Custom profiles for sensitive services
- System call filtering

### AppArmor/SELinux
- Enable mandatory access control
- Restrict file access patterns
- Limit network operations

### Image Scanning
- **Trivy**: Weekly vulnerability scans
- **Grype**: Container image analysis
- **Docker Scout**: Real-time monitoring
- **Snyk**: Dependency and configuration scanning

### Build Security
- Use multi-stage builds (minimal final image)
- Pin base image versions (no `latest`)
- Verify image signatures
- Scan build context before build

### Runtime Security
- **Read-only root filesystem** where possible
- **No new privileges**: `--security-opt no-new-privileges`
- **Capability dropping**: Remove all non-essential capabilities
- **Resource quotas**: CPU, memory, PIDs, file descriptors

## Compliance

### CIS Docker Benchmark
- Follow CIS Docker Benchmark guidelines
- Regular audits against benchmark
- Document exceptions with justification

### Security Scanning Schedule
- **Daily**: Automated image scans
- **Weekly**: Full vulnerability assessment
- **Monthly**: Configuration review
- **Quarterly**: Penetration testing

### Incident Response
1. **Detect**: Automated alerts for critical vulnerabilities
2. **Contain**: Isolate affected containers
3. **Eradicate**: Rebuild images with patches
4. **Recover**: Deploy updated containers
5. **Learn**: Post-incident review and improvements