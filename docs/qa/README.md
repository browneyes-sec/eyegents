# Cobalto SOC/MDR — QA Documentation Index

**Audit Date:** 2026-07-06  
**Assessed By:** QA Agent (eyegents)  
**Repository:** [browneyes-sec/cobalto](https://github.com/browneyes-sec/cobalto)

---

## Documents

| # | Document | Description |
|---|----------|-------------|
| 1 | [cobalto-qa-assessment.md](./cobalto-qa-assessment.md) | Full QA assessment across platform engineering, software hardening, test gaps, and security controls. Includes severity-ranked findings and release gate criteria. |
| 2 | [cobalto-test-cases.md](./cobalto-test-cases.md) | Complete test case specification: 72 unit tests, 15 integration tests, 14 infrastructure tests, 20 security/injection tests, 8 performance tests. All with priority levels. |
| 3 | [cobalto-validation-plan.md](./cobalto-validation-plan.md) | Validation strategy with CI/CD pipeline, 6-phase test execution matrix, quality gates, acceptance criteria checklist, and tooling requirements. |
| 4 | [fuzzer/prompt_injection_fuzzer.py](./fuzzer/prompt_injection_fuzzer.py) | **Programmatic security fuzzer** — generates 500+ adversarial payloads (prompt injection, Unicode bypass, schema smuggling) against the PromptInjectionGuard. CLI + JSON reporting. |
| 5 | [fuzzer/property_based_tests.py](./fuzzer/property_based_tests.py) | **Hypothesis property-based tests** — 500+ generated examples per test for PromptInjectionGuard, InputValidator, RateLimiter, and AuditLogger. Detects edge cases unit tests miss. |
| 6 | [fuzzer/validate_hardening.sh](./fuzzer/validate_hardening.sh) | **K8s hardening validation script** — 12 automated checks (privileged containers, non-root, PDB, NetworkPolicies, secrets, etc.) with CI-ready exit codes. |

---

## Quick Start

```bash
# 1. Run the prompt injection fuzzer (standalone)
python docs/qa/fuzzer/prompt_injection_fuzzer.py --count 500

# 2. Run property-based tests (requires hypothesis)
pip install hypothesis pytest
python -m pytest docs/qa/fuzzer/property_based_tests.py -v --hypothesis-show-statistics

# 3. Validate K8s hardening
bash docs/qa/fuzzer/validate_hardening.sh --k8s-dir ../kubernetes
```

---

## Key Findings Summary

| Severity | Count | Top Issue |
|----------|-------|-----------|
| 🔴 Critical | 3 | Vault dev mode with hardcoded root token |
| 🟠 High | 7 | No API auth, No console auth, No PodSecurityContext |
| 🟡 Medium | 8 | No PDBs, Audit only to stdout, No property-based tests |
| 🔵 Low | 5 | Missing pre-commit hooks, No CI config |

---

## Test Inventory

| Suite | Count | Status |
|-------|-------|--------|
| Existing unit tests | 60 | ✅ Existing |
| Existing integration tests | 11 | ✅ Existing |
| Proposed unit tests (new) | 22 | 📝 Specified |
| Proposed integration tests | 15 | 📝 Specified |
| Property-based tests | 15 | 🚀 Implemented (fuzzer/) |
| Injection/fuzz payloads | 800+ | 🚀 Implemented (fuzzer/) |
| K8s hardening checks | 12 | 🚀 Implemented (validate_hardening.sh) |
| Performance tests | 8 | 📝 Specified |

---

## Quick Links

- **Project:** https://github.com/browneyes-sec/cobalto
- **Documentation:** https://github.com/browneyes-sec/cobalto/tree/main/docs
- **Phase 3-4 PR:** Commit `38863ad` (63 tests, middleware, console, MDR ops)
