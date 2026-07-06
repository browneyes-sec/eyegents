# Cobalto SOC/MDR Platform — QA Assessment Report

**Date:** 2026-07-06  
**Assessed By:** QA Agent (eyegents)  
**Repository:** [browneyes-sec/cobalto](https://github.com/browneyes-sec/cobalto)  
**Branch:** `main`  
**Commits Analyzed:** 3 latest pushes (38863ad, affcefb, b1c0a1f)  

---

## Executive Summary

Cobalto is an **Agentic SOC/MDR Open Source platform** using LangGraph agents, FastAPI, Next.js frontend, and K8s-native deployment. The 3 latest pushes deliver Phase 3-4 hardening with middleware (rate limiter, audit logger, input validator, prompt injection guard), 63 tests, a Next.js console, MDR ops services, and 27 documentation files.

**Overall Maturity: Early Beta (Phase 3-4 of ~6 phases)**  
**Security Posture: Moderate — good foundation, critical gaps in production readiness**

---

## 1. Three Latest Pushes — Scope Analysis

### Push 1: `38863ad` — Phase 3-4 Hardening (Core)
| Layer | Files Changed | Quality |
|-------|--------------|---------|
| Middleware | `rate_limiter.py`, `audit.py`, `validator.py`, `injection_guard.py` | ✅ Well-structured, tested |
| Agent logic | `api/__init__.py` (6 agents) | ✅ Clean async architecture |
| State graph | `graph/__init__.py` | ✅ Conditional routing, checkpointing |
| Console | `cobalt-console/` (13 TSX files) | ✅ Dark theme, responsive |
| MDR Ops | `slas.py`, `reporting.py`, `scheduling.py` | ✅ Domain-driven, tested |
| Tests | 63 tests (unit + integration) | ✅ Good coverage, mock-based |

### Push 2: `affcefb` — Documentation Addition
| Layer | Count | Quality |
|-------|-------|---------|
| Architecture docs | 8 files | ✅ Comprehensive ADRs |
| Developer guides | 2 files | ✅ Setup + walkthrough |
| Context docs | 4 files | ✅ Business/domain/regulatory |

### Push 3: `b1c0a1f` — Full Documentation Suite
| Layer | Count | Quality |
|-------|-------|---------|
| DTP (Design Tech Principles) | 5 files | ✅ Design axioms documented |
| Framework | 4 files | ✅ LangGraph, n8n, testing, deployment |
| Architecture | 9 files | ✅ Complete service architecture |
| Operations | 5 files | ✅ Runbooks for all services |
| ADRs | 4 files | ✅ TheHive, Vault, Grafana, K8s decisions |

---

## 2. Platform Engineering Assessment

### 2.1 K8s Infrastructure

| Area | Current State | Finding |
|------|--------------|---------|
| **Namespaces** | 8 namespaces defined | ✅ Proper isolation |
| **Network Policies** | Default-deny + langgraph policy | ⚠️ Only 2 services have NetworkPolicies |
| **HPA** | CPU-based autoscaling (2-10 pods) | ✅ Good, no memory metric |
| **PodDisruptionBudget** | Not defined | ❌ No PDB = potential downtime |
| **PodSecurityContext** | Not set on any pod | ❌ Runs as root by default |
| **ServiceAccount** | `langgraph-sa` defined | ✅ But no granular RBAC shown |
| **Secrets** | `YOUR_ECR_REPO` placeholder | ❌ No External Secrets Operator |
| **Resource Limits** | Set on langgraph, vault | ✅ Missing on n8n, cortex, wazuh |
| **Readiness/Liveness** | langgraph, vault have probes | ✅ Others missing |
| **StartupProbe** | langgraph has aggressive config | ✅ Good for LLM cold-start |

### 2.2 Vault Configuration — CRITICAL FINDING

```yaml
# kubernetes/vault/statefulset.yaml
env:
  - name: VAULT_DEV_ROOT_TOKEN_ID
    value: "root-token"  # HARDCODED DEV TOKEN
```

- **Severity:** Critical
- **Risk:** Full Vault compromise, access to all secrets
- **Fix:** Remove dev mode. Use `vault write` init + unseal flow
- **Mitigation:** Never deploy this manifest to production

### 2.3 Terraform Infrastructure

| Module | Quality | Issues |
|--------|---------|--------|
| VPC | ✅ Standard | None |
| EKS | ✅ Well-structured | No node group security context |
| RDS | ⚠️ Missing | No `prevent_destroy` on critical DBs |
| S3 | ⚠️ Missing | No bucket versioning/policy |
| WAF | ❌ Stub | Configuration incomplete |
| KMS | ⚠️ Stub | No key rotation policy |
| IAM | ⚠️ Partial | No least-privilege analysis |

---

## 3. Software Hardening Assessment

### 3.1 LangGraph Agent Security

#### Prompt Injection Guard ✅
- 17 injection patterns (ignore, pretend, DAN, developer mode)
- Control character stripping (0x00-0x1f, 0x7f, 0x80-0x9f)
- Wraps user input in XML-style context tags
- **Misses:** Unicode normalization attacks, ROT13/Base64 encoded payloads

#### Input Validator ✅
- JSON Schema validation (alert_id, severity, source required)
- Severity enum validation
- Indicator type/value validation
- **Issue:** `additionalProperties: true` allows schema smuggling

#### Rate Limiter ✅
- Token bucket per agent_id
- Thread-safe with `threading.Lock()`
- **Issue:** In-memory only — lost on pod restart, no Redis backend

#### Audit Logger ✅
- HMAC-SHA256 signed entries
- Event IDs, timestamps, severity levels
- Signature verification method
- **Issue:** Only `print()` to stdout — no structured log shipping

### 3.2 Docker Security

| Service | Base Image | USER | Healthcheck | Root | Issues |
|---------|-----------|------|-------------|------|--------|
| langgraph-agent | python:3.12-slim | ❌ root | ❌ None | ✅ | No `.dockerignore`, no non-root user |
| cobalt-console | node:20 → nginx:alpine | ❌ root | ❌ None | ✅ nginx runs as nobody | Builder stage runs as root |

### 3.3 API Security

| Endpoint | Auth | Rate Limiting | Input Validation | Notes |
|----------|------|---------------|------------------|-------|
| `POST /agent/analyze` | ❌ None | ⚠️ Per-agent only | ✅ Pydantic | No API key/token |
| `GET /health` | ❌ None | ❌ None | N/A | OK for probes |
| `GET /ready` | ❌ None | ❌ None | N/A | OK for probes |
| `GET /graph/visualize` | ❌ None | ❌ None | N/A | Exposes internal graph |

### 3.4 Console / Frontend Security

| Check | Status | Notes |
|-------|--------|-------|
| HTTPS enforced | ⚠️ Ingress assumed | No redirect middleware |
| CSP Headers | ❌ Not set | Vulnerable to XSS |
| Auth | ❌ None | No login, no session |
| CORS | ❌ Not configured | Default permissive |
| CSRF | ❌ Not protected | Axios with cookie defaults |
| Input sanitization | ⚠️ Server assumed | No client-side validation |
| Error boundaries | ❌ Not implemented | React tree crashes exposed |

### 3.5 Data Security

| Data Store | Encryption at Rest | Encryption in Transit | Access Control |
|-----------|-------------------|----------------------|----------------|
| Qdrant | ❌ Not configured | ❌ HTTP (not HTTPS) | API key optional |
| Elasticsearch | ❌ Not configured | ❌ HTTP | None defined |
| OpenCTI | ❌ Not configured | ❌ HTTP | API key in env |
| Cortex | ❌ Not configured | ❌ HTTP | API key in env |

---

## 4. Test Infrastructure Assessment

### 4.1 Test Coverage

| Test Suite | Count | Type | Quality |
|-----------|-------|------|---------|
| `test_state.py` | 12 | Unit | ✅ Covers edge cases, bounds |
| `test_agents.py` | 10 | Unit | ✅ Mock agents, all paths |
| `test_middleware.py` | 27 | Unit | ✅ Excellent — edge cases, tamper |
| `test_tools.py` | 6 | Unit | ✅ Mocked external services |
| `test_api.py` | 11 | Integration | ⚠️ Uses test app, not real |
| `test_workflow.py` | 5 | Integration | ⚠️ Mock workflow, not real graph |
| **Total** | **71** | | |

### 4.2 Coverage Gaps

| Missing Area | Impact |
|-------------|--------|
| **No property-based tests** | Bound/flaky edge cases undetected |
| **No E2E tests** | No real K8s deployment validation |
| **No performance/benchmark tests** | No latency regression detection |
| **No fuzz tests** | Prompt injection fuzzing missing |
| **No contract tests** | No API schema validation in CI |
| **Console has zero tests** | Frontend completely untested |

### 4.3 Test Quality

- ✅ AAA pattern followed
- ✅ Descriptive test names (`should_X_when_Y`)
- ✅ Fixtures for reusable state
- ⚠️ Tests use mocks only, no real service integration
- ❌ No `coverage` configuration in `pyproject.toml`

---

## 5. Security Control Gaps (Ranked by Severity)

| # | Finding | Severity | Location | Fix |
|---|---------|----------|----------|-----|
| 1 | Vault hardcoded root token | **Critical** | vault/statefulset.yaml | Remove dev mode |
| 2 | No auth on any API endpoint | **Critical** | main.py | Add API key middleware |
| 3 | Console has no authentication | **Critical** | console/src | Add SSO/OAuth |
| 4 | No External Secrets Operator | **High** | k8s/base/secrets | Add ESO + VaultProvider |
| 5 | No PodSecurityContext on any pod | **High** | All deployments | Add runAsNonRoot |
| 6 | No PDBs for any workload | **High** | All workloads | Add PodDisruptionBudget |
| 7 | No NetworkPolicies for 6/8 namespaces | **High** | k8s namespaces | Add per-service policies |
| 8 | No `additionalProperties: false` in schema | **High** | validator.py | Tighten schema |
| 9 | Docker runs as root | **High** | Dockerfiles | Add USER directive |
| 10 | Audit logs only to stdout | **Medium** | audit.py | Add file/log shipper |
| 11 | No CORS/security headers in console | **Medium** | console/nginx.conf | Add CSP, X-Frame-Options |
| 12 | No CI/CD pipeline config | **Medium** | Missing | Add GitHub Actions |
| 13 | No dependabot/renovate | **Medium** | Missing | Add dependency scanning |
| 14 | No `prevent_destroy` on TF stateful resources | **Medium** | terraform/ | Add lifecycle |
| 15 | No property-based tests | **Medium** | test suite | Add fast-check/hypothesis |

---

## 6. Acceptance Criteria for Release

### Must-Fix (Blocking)

- [ ] **AC-01:** Vault production configuration (no dev mode, proper init/unseal)
- [ ] **AC-02:** API authentication (JWT or API key) on `/agent/analyze`
- [ ] **AC-03:** Console login/auth page with session management
- [ ] **AC-04:** External Secrets Operator integration for all secrets
- [ ] **AC-05:** PodSecurityContext (`runAsNonRoot: true`, `readOnlyRootFilesystem: true`)
- [ ] **AC-06:** PodDisruptionBudget for all workloads (minAvailable: 1)
- [ ] **AC-07:** NetworkPolicies for all namespaces (default-deny + allow rules)
- [ ] **AC-08:** Tighten JSON schema — set `additionalProperties: false`

### Should-Fix (High Priority)

- [ ] **AC-09:** Docker USER directive for both containers
- [ ] **AC-10:** Structured audit logging (JSON to stdout with log shipper sidecar)
- [ ] **AC-11:** Rate limiter with Redis backend (distributed, persistent)
- [ ] **AC-12:** Fuzz testing pipeline for prompt injection guard
- [ ] **AC-13:** Console CSP, CORS, XSS protection headers
- [ ] **AC-14:** API endpoint input size limits
- [ ] **AC-15:** Pre-commit hooks for linting/secrets

### Nice-to-Have

- [ ] **AC-16:** Property-based tests for middleware components
- [ ] **AC-17:** Coverage enforcement in CI (unit ≥ 80%, integration ≥ 60%)
- [ ] **AC-18:** Benchmark tests for agent latency
- [ ] **AC-19:** OpenAPI/Swagger docs for all endpoints
- [ ] **AC-20:** E2E tests with kind/k3s local cluster
- [ ] **AC-21:** OPA/Gatekeeper policies for pod security
- [ ] **AC-22:** VPA alongside HPA for memory-aware scaling

---

*End of QA Assessment Report*
