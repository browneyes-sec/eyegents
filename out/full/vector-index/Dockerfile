FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache python3 make g++

FROM base AS deps
COPY package*.json ./
COPY turbo.json ./
COPY tsconfig.base.json ./
COPY packages/shared-types ./packages/shared-types
COPY packages/qdrant-client ./packages/qdrant-client
COPY packages/ollama-client ./packages/ollama-client
COPY vector-index ./vector-index
RUN npm ci --workspace=@eyegents/shared-types --workspace=@eyegents/qdrant-client --workspace=@eyegents/ollama-client --workspace=@eyegents/vector-index

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/vector-index ./vector-index
COPY --from=deps /app/turbo.json ./
COPY --from=deps /app/tsconfig.base.json ./
RUN npm run build --workspace=@eyegents/shared-types --workspace=@eyegents/qdrant-client --workspace=@eyegents/ollama-client --workspace=@eyegents/vector-index

FROM base AS production
ENV NODE_ENV=production
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=builder /app/packages/qdrant-client/dist ./packages/qdrant-client/dist
COPY --from=builder /app/packages/qdrant-client/package.json ./packages/qdrant-client/package.json
COPY --from=builder /app/packages/ollama-client/dist ./packages/ollama-client/dist
COPY --from=builder /app/packages/ollama-client/package.json ./packages/ollama-client/package.json
COPY --from=builder /app/vector-index/dist ./vector-index/dist
COPY --from=builder /app/vector-index/package.json ./vector-index/package.json
COPY --from=builder /app/node_modules/@eyegents ./node_modules/@eyegents
COPY --from=builder /app/node_modules/tree-sitter* ./node_modules/
COPY --from=builder /app/node_modules/chokidar ./node_modules/chokidar
COPY --from=builder /app/node_modules/ignore ./node_modules/ignore
COPY --from=builder /app/node_modules/fast-glob ./node_modules/fast-glob
WORKDIR /app/vector-index
ENTRYPOINT ["node", "dist/indexer.js"]