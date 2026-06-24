# Performance Rules

## Budgets
- API response: <200ms p95
- Page load: <3s (LCP <2.5s)
- Bundle size: <200KB gzipped (initial)
- DB query: <50ms p95

## Patterns
- Connection pooling (DB, HTTP)
- Caching: Redis for hot data, CDN for static
- Pagination: cursor-based, max 100 items
- Lazy loading: code splitting, images, components
- Streaming responses for large data

## Monitoring
- Metrics: latency, error rate, throughput, saturation
- Distributed tracing (W3C TraceContext)
- Structured logs (JSON, correlation IDs)
- Alerts on SLO breach

## Optimization
- Profile before optimizing
- Index DB queries (EXPLAIN ANALYZE)
- Avoid N+1 (DataLoader, join)
- Minimize allocations in hot paths