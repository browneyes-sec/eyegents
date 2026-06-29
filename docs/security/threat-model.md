# Security Threat Model

## STRIDE Analysis

### Spoofing
- **Threat**: Impersonation of MCP server or OpenCode agent
- **Impact**: Unauthorized code execution, data exfiltration
- **Mitigation**: Container network isolation, API key authentication

### Tampering
- **Threat**: Modification of vector embeddings or code chunks
- **Impact**: Corrupted search results, malicious code injection
- **Mitigation**: Cryptographic integrity checks, immutable storage

### Repudiation
- **Threat**: Denial of actions performed via MCP tools
- **Impact**: Audit trail gaps, compliance issues
- **Mitigation**: Structured logging, agent decision tracking

### Information Disclosure
- **Threat**: Exposure of secrets, code, or conversation data
- **Impact**: Credential theft, IP leakage
- **Mitigation**: Secrets management, container isolation, TLS

### Denial of Service
- **Threat**: Resource exhaustion via infinite loops or large payloads
- **Impact**: Platform unavailability, degraded performance
- **Mitigation**: CPU/memory limits, request timeouts

### Elevation of Privilege
- **Threat**: Container breakout or unauthorized system access
- **Impact**: Host compromise, lateral movement
- **Mitigation**: Non-root containers, read-only filesystems, capability dropping

## Data Flows

```
User → OpenCode (CLI/Web) → MCP Server → Qdrant (vectors)
                             ↓
                           Ollama (local LLM)
                             ↓
                           OpenRouter (remote LLM)
```

### Flow 1: User to OpenCode
- **Protocol**: HTTP/WebSocket (local)
- **Data**: Code, commands, prompts
- **Trust**: High (local user)

### Flow 2: OpenCode to MCP Server
- **Protocol**: stdio/HTTP (Docker network)
- **Data**: Tool calls, results, context
- **Trust**: Medium (container boundary)

### Flow 3: MCP Server to Qdrant
- **Protocol**: HTTP/gRPC (Docker network)
- **Data**: Embeddings, search queries, vectors
- **Trust**: Medium (internal service)

### Flow 4: MCP Server to Ollama
- **Protocol**: HTTP (Docker network)
- **Data**: Prompts, completions, model metadata
- **Trust**: Medium (local inference)

### Flow 5: MCP Server to OpenRouter
- **Protocol**: HTTPS (external API)
- **Data**: Prompts, completions, API keys
- **Trust**: Low (external service)

## Trust Boundaries

### 1. Local Network
- **Scope**: User machine, Docker host
- **Controls**: Firewall, local authentication
- **Risks**: Local privilege escalation, malware

### 2. Docker Network
- **Scope**: Container-to-container communication
- **Controls**: Network isolation, resource limits
- **Risks**: Container breakout, lateral movement

### 3. External APIs
- **Scope**: OpenRouter, GitHub API
- **Controls**: API keys, TLS, rate limiting
- **Risks**: Credential leakage, data exfiltration

### 4. Host System
- **Scope**: Filesystem, processes, kernel
- **Controls**: Non-root containers, read-only mounts
- **Risks**: Container escape, filesystem access

## Threats

### Credential Exposure
- **Description**: API keys, tokens, or secrets leaked in logs, commits, or environment
- **Vectors**: Git history, Docker images, memory dumps, stack traces
- **Impact**: Unauthorized access to external services

### Prompt Injection
- **Description**: Malicious prompts that override system instructions
- **Vectors**: User input, file content, vector search results
- **Impact**: Unauthorized actions, data exfiltration

### Data Exfiltration
- **Description**: Unauthorized transfer of code, secrets, or conversations
- **Vectors**: MCP tools, network requests, file writes
- **Impact**: IP theft, compliance violations

### Supply Chain Attacks
- **Description**: Compromised dependencies or container images
- **Vectors**: npm packages, Docker base images, Python libraries
- **Impact**: Backdoor installation, credential theft

## Mitigations

### Secrets Management
- Use `.secrets` file (gitignored) for local development
- GitHub Secrets for CI/CD workflows
- Docker environment variables from `.env` file (never commit)
- Regular key rotation (quarterly minimum)

### Container Isolation
- Custom Docker network (`eyegents-net`) for service communication
- Non-root user in containers
- Read-only filesystems where possible
- Resource limits (CPU, memory) on all services

### API Key Rotation
- Quarterly rotation for all external API keys
- Immediate rotation after any suspected exposure
- Automated rotation via CI/CD where supported
- Audit logs for key usage

### Dependency Scanning
- Weekly automated scans (Dependabot, OSV, Snyk)
- Manual review for critical dependencies
- Lock file integrity checks
- Container image scanning (Trivy, Grype)

### Additional Controls
- Pre-commit hooks to prevent secret commits
- Network policies limiting container egress
- Input validation and sanitization
- Structured logging for audit trails