FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache git

FROM base AS deps
COPY package*.json ./
COPY turbo.json ./
COPY tsconfig.base.json ./
COPY packages/shared-types ./packages/shared-types
COPY packages/qdrant-client ./packages/qdrant-client
COPY packages/ollama-client ./packages/ollama-client
COPY packages/openrouter-client ./packages/openrouter-client
COPY packages/github-client ./packages/github-client
COPY packages/context-engine ./packages/context-engine
COPY packages/agent-runtime ./packages/agent-runtime
COPY vector-index ./vector-index
COPY mcp-server ./mcp-server
RUN npm ci --workspace=@eyegents/shared-types --workspace=@eyegents/qdrant-client --workspace=@eyegents/ollama-client --workspace=@eyegents/openrouter-client --workspace=@eyegents/github-client --workspace=@eyegents/context-engine --workspace=@eyegents/agent-runtime --workspace=@eyegents/vector-index --workspace=@eyegents/mcp-server

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/vector-index ./vector-index
COPY --from=deps /app/mcp-server ./mcp-server
COPY --from=deps /app/turbo.json ./
COPY --from=deps /app/tsconfig.base.json ./
RUN npm run build --workspace=@eyegents/shared-types --workspace=@eyegents/qdrant-client --workspace=@eyegents/ollama-client --workspace=@eyegents/openrouter-client --workspace=@eyegents/github-client --workspace=@eyegents/context-engine --workspace=@eyegents/agent-runtime --workspace=@eyegents/vector-index --workspace=@eyegents/mcp-server

FROM base AS production
ENV NODE_ENV=production
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
COPY --from=builder /app/packages/agent-runtime/dist ./packages/agent-runtime/dist
COPY --from=builder /app/packages/agent-runtime/package.json ./packages/agent-runtime/package.json
COPY --from=builder /app/vector-index/dist ./vector-index/dist
COPY --from=builder /app/vector-index/package.json ./vector-index/package.json
COPY --from=builder /app/mcp-server/dist ./mcp-server/dist
COPY --from=builder /app/mcp-server/package.json ./mcp-server/package.json
COPY --from=builder /app/node_modules/@eyegents ./node_modules/@eyegents
COPY --from=builder /app/node_modules/@modelcontextprotocol ./node_modules/@modelcontextprotocol
COPY --from=builder /app/node_modules/zod ./node_modules/zod
COPY --from=builder /app/node_modules/pino ./node_modules/pino
COPY --from=builder /app/node_modules/@octokit ./node_modules/@octokit
COPY --from=builder /app/node_modules/fast-glob ./node_modules/fast-glob
WORKDIR /app/mcp-server
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=3s --retries=3 CMD wget -qO- http://localhost:3001/health || exit 1
ENTRYPOINT ["node", "dist/index.js"]
