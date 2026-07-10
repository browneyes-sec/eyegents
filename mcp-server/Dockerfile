FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache git

FROM base AS deps
COPY out/json .
COPY out/full/package.json ./
COPY package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY out/full .
COPY tsconfig.base.json ./
COPY package-lock.json ./
RUN npx turbo run build --filter=@eyegents/mcp-server

FROM base AS production
ENV NODE_ENV=production

# Python + Aider for AI pair-programming via MCP tools
# Installed in isolated venv to avoid PEP 668 system Python restrictions
# Slim: remove pip/setuptools, pyc caches, and test dirs after install
RUN apk add --no-cache python3 py3-pip && \
    python3 -m venv /opt/aider-venv && \
    /opt/aider-venv/bin/pip install --no-cache-dir aider-chat==0.86.2 && \
    ln -sf /opt/aider-venv/bin/aider /usr/local/bin/aider && \
    /opt/aider-venv/bin/pip uninstall -y pip setuptools wheel 2>/dev/null || true && \
    find /opt/aider-venv -name '__pycache__' -type d -exec rm -rf {} + 2>/dev/null || true && \
    find /opt/aider-venv -name '*.pyc' -delete 2>/dev/null || true && \
    find /opt/aider-venv -path '*/tests/*' -type f -delete 2>/dev/null || true && \
    find /opt/aider-venv -path '*/test/*' -type f -delete 2>/dev/null || true && \
    rm -rf /root/.cache /tmp/*

# Aider config files at repo root (read by aider_execute tool)
COPY .aider.conf.yml ./
COPY CONVENTIONS.md ./
COPY .aiderignore ./
COPY .aider.model.settings.yml ./
COPY .aider.model.metadata.json ./

COPY --from=deps /app/package.json ./
COPY --from=deps /app/package-lock.json ./
COPY --from=builder /app/mcp-server/dist ./mcp-server/dist
COPY --from=builder /app/mcp-server/package.json ./mcp-server/package.json
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=builder /app/packages/qdrant-client/dist ./packages/qdrant-client/dist
COPY --from=builder /app/packages/qdrant-client/package.json ./packages/qdrant-client/package.json
COPY --from=builder /app/packages/ollama-client/dist ./packages/ollama-client/dist
COPY --from=builder /app/packages/ollama-client/package.json ./packages/ollama-client/package.json
COPY --from=builder /app/packages/openrouter-client/dist ./packages/openrouter-client/dist
COPY --from=builder /app/packages/openrouter-client/package.json ./packages/openrouter-client/package.json
COPY --from=builder /app/packages/github-client/dist ./packages/github-client/dist
COPY --from=builder /app/packages/github-client/package.json ./packages/github-client/package.json
COPY --from=builder /app/packages/context-engine/dist ./packages/context-engine/dist
COPY --from=builder /app/packages/context-engine/package.json ./packages/context-engine/package.json
COPY --from=builder /app/packages/mcp-client/dist ./packages/mcp-client/dist
COPY --from=builder /app/packages/mcp-client/package.json ./packages/mcp-client/package.json
COPY --from=builder /app/packages/agent-runtime/dist ./packages/agent-runtime/dist
COPY --from=builder /app/packages/agent-runtime/package.json ./packages/agent-runtime/package.json
COPY --from=builder /app/vector-index/dist ./vector-index/dist
COPY --from=builder /app/vector-index/package.json ./vector-index/package.json
RUN npm ci --omit=dev
WORKDIR /app
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=3s --retries=3 CMD wget -qO- http://localhost:3001/health || exit 1
ENTRYPOINT ["node", "mcp-server/dist/index.js"]
