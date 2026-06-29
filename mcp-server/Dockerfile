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
WORKDIR /app/mcp-server
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=3s --retries=3 CMD wget -qO- http://localhost:3001/health || exit 1
ENTRYPOINT ["node", "dist/index.js"]
