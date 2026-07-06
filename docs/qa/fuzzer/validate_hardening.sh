#!/usr/bin/env bash
#=============================================================================
# Cobalto K8s Hardening Validation Script
# 
# Validates Kubernetes manifests against production security standards.
# Usage:  bash docs/qa/fuzzer/validate_hardening.sh [--fix] [--k8s-dir <path>]
#=============================================================================

set -euo pipefail

# ── Config ──────────────────────────────────────────────────────────
K8S_DIR="${K8S_DIR:-kubernetes}"
FIX_MODE="${FIX_MODE:-false}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0
FIXED=0

pass() { ((PASS++)); echo -e "  ${GREEN}✓${NC} $1"; }
fail() { ((FAIL++)); echo -e "  ${RED}✗${NC} $1"; }
warn() { ((WARN++)); echo -e "  ${YELLOW}⚠${NC} $1"; }

# ── Checks ──────────────────────────────────────────────────────────

check_no_privileged_containers() {
    local found=0
    while IFS= read -r file; do
        if grep -q 'privileged: true' "$file" 2>/dev/null; then
            fail "Privileged container in: $file"
            ((found++))
        fi
    done < <(find "$K8S_DIR" -name '*.yaml' -type f)
    [ "$found" -eq 0 ] && pass "No privileged containers"
}

check_run_as_nonroot() {
    local found=0 total=0
    while IFS= read -r file; do
        ((total++))
        if grep -q 'runAsNonRoot: true' "$file" 2>/dev/null; then
            ((found++))
        fi
    done < <(find "$K8S_DIR" -name '*.yaml' -type f)
    
    if [ "$found" -eq "$total" ]; then
        pass "All ($total) manifests have runAsNonRoot"
    elif [ "$found" -eq 0 ]; then
        fail "NO manifests have runAsNonRoot ($total checked)"
    else
        fail "Only $found/$total manifests have runAsNonRoot"
    fi
}

check_readonly_rootfs() {
    local found=0 total=0
    while IFS= read -r file; do
        ((total++))
        if grep -q 'readOnlyRootFilesystem: true' "$file" 2>/dev/null; then
            ((found++))
        fi
    done < <(find "$K8S_DIR" -name '*.yaml' -type f)
    
    [ "$found" -eq 0 ] && fail "No readOnlyRootFilesystem set in $total manifests" || \
    [ "$found" -eq "$total" ] && pass "All ($total) have readOnlyRootFilesystem" || \
    fail "Only $found/$total have readOnlyRootFilesystem"
}

check_pdb_exists() {
    local count
    count=$(find "$K8S_DIR" -name '*poddisruption*' -o -name '*pdb*' | grep -c . || true)
    [ "$count" -gt 0 ] && pass "Found $count PodDisruptionBudget(s)" || \
    fail "No PodDisruptionBudget found (all workloads vulnerable to node drain)"
}

check_resource_limits() {
    local found=0 total=0
    while IFS= read -r file; do
        if grep -qE '(limits:|resources:)' "$file" 2>/dev/null; then
            ((found++))
        fi
        ((total++))
    done < <(find "$K8S_DIR" -name 'deployment.yaml' -o -name 'statefulset.yaml' -o -name 'daemonset.yaml')
    
    [ "$found" -eq 0 ] && fail "No resource limits found" || \
    [ "$found" -eq "$total" ] && pass "All ($total) workload manifests have resource limits" || \
    fail "Only $found/$total have resource limits"
}

check_liveness_probes() {
    local found=0 total=0
    while IFS= read -r file; do
        ((total++))
        if grep -q 'livenessProbe:' "$file" 2>/dev/null; then
            ((found++))
        fi
    done < <(find "$K8S_DIR" -name 'deployment.yaml' -o -name 'statefulset.yaml')
    
    [ "$found" -eq 0 ] && fail "No liveness probes" || \
    [ "$found" -eq "$total" ] && pass "All ($total) have liveness probes" || \
    fail "Only $found/$total have liveness probes"
}

check_readiness_probes() {
    local found=0 total=0
    while IFS= read -r file; do
        ((total++))
        if grep -q 'readinessProbe:' "$file" 2>/dev/null; then
            ((found++))
        fi
    done < <(find "$K8S_DIR" -name 'deployment.yaml' -o -name 'statefulset.yaml')
    
    [ "$found" -eq 0 ] && fail "No readiness probes" || \
    [ "$found" -eq "$total" ] && pass "All ($total) have readiness probes" || \
    fail "Only $found/$total have readiness probes"
}

check_no_hardcoded_secrets() {
    local patterns=(
        'password:'
        'api_key:'
        'api-key:'
        'secret:'
        'token:'
        'root-token'
        'YOUR_'
    )
    local found=0
    
    for pattern in "${patterns[@]}"; do
        while IFS= read -r file; do
            local line
            line=$(grep -n "$pattern" "$file" 2>/dev/null || true)
            if [ -n "$line" ]; then
                # Exclude known-safe patterns like secretKeyRef, env var names
                if ! echo "$line" | grep -qE '(secretKeyRef|env:|name:|key:|\.yaml|password-auth|no-proxy)'; then
                    warn "Potential secret in $file: $line"
                    ((found++))
                fi
            fi
        done < <(find "$K8S_DIR" -name '*.yaml' -type f)
    done
    
    [ "$found" -eq 0 ] && pass "No hardcoded secrets detected" || \
    warn "$found potential secret(s) found (review recommended)"
}

check_network_policies() {
    local count
    count=$(find "$K8S_DIR" -name '*networkpolicy*' | grep -c . || true)
    [ "$count" -gt 0 ] && pass "Found $count NetworkPolicy resource(s)" || \
    fail "No NetworkPolicies found"
}

check_dockerfile_user() {
    local found=0 total=0
    while IFS= read -r file; do
        ((total++))
        if grep -qE '^USER ' "$file" 2>/dev/null; then
            ((found++))
        fi
    done < <(find "$K8S_DIR/.." -name 'Dockerfile' -path '*/services/*' 2>/dev/null || find . -name 'Dockerfile' ! -path '*/node_modules/*')
    # Also check services/Dockerfile
    while IFS= read -r file; do
        ((total++))
        if grep -qE '^USER ' "$file" 2>/dev/null; then
            ((found++))
        fi
    done < <(find .. -name 'Dockerfile' -path '*/services/*' 2>/dev/null || true)
    
    [ "$total" -eq 0 ] && warn "No Dockerfiles found in expected paths" || \
    [ "$found" -eq "$total" ] && pass "All ($total) Dockerfiles have USER directive" || \
    fail "Only $found/$total Dockerfiles have USER directive"
}

check_yaml_syntax() {
    local errors=0
    while IFS= read -r file; do
        if command -v python3 &>/dev/null; then
            python3 -c "
import yaml, sys
try:
    yaml.safe_load(open('$file'))
except yaml.YAMLError as e:
    print(f'YAML error in $file: {e}')
    sys.exit(1)
" 2>/dev/null || ((errors++))
        fi
    done < <(find "$K8S_DIR" -name '*.yaml' -type f)
    
    [ "$errors" -eq 0 ] && pass "All YAML files valid" || \
    fail "$errors YAML file(s) with syntax errors"
}

check_serviceaccount_token() {
    local found=0 total=0
    while IFS= read -r file; do
        ((total++))
        if grep -q 'automountServiceAccountToken: false' "$file" 2>/dev/null; then
            ((found++))
        fi
    done < <(find "$K8S_DIR" -name 'deployment.yaml' -o -name 'statefulset.yaml' -o -name 'pod.yaml')
    
    [ "$total" -eq 0 ] && warn "No workload manifests to check for SA token auto-mount" || \
    [ "$found" -eq "$total" ] && pass "All ($total) disable SA token auto-mount" || \
    warn "Only $found/$total disable SA token auto-mount (recommended for least-privilege)"
}

# ── Main ────────────────────────────────────────────────────────────

main() {
    # Parse args
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --fix) FIX_MODE=true; shift ;;
            --k8s-dir) K8S_DIR="$2"; shift 2 ;;
            *) echo "Unknown arg: $1"; exit 1 ;;
        esac
    done

    echo ""
    echo -e "${BOLD}╔═══════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}║     Cobalto K8s Hardening Validation        ║${NC}"
    echo -e "${BOLD}╚═══════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "K8s directory: ${BOLD}$(realpath "$K8S_DIR" 2>/dev/null || echo "$K8S_DIR")${NC}"
    echo ""

    # ── Run all checks ──
    echo -e "${BOLD}1. Security Context${NC}"
    check_no_privileged_containers
    check_run_as_nonroot
    check_readonly_rootfs
    check_serviceaccount_token

    echo ""
    echo -e "${BOLD}2. Availability${NC}"
    check_pdb_exists
    check_liveness_probes
    check_readiness_probes
    check_resource_limits

    echo ""
    echo -e "${BOLD}3. Network Security${NC}"
    check_network_policies

    echo ""
    echo -e "${BOLD}4. Secrets & Config${NC}"
    check_no_hardcoded_secrets

    echo ""
    echo -e "${BOLD}5. Build & Deploy${NC}"
    check_dockerfile_user

    echo ""
    echo -e "${BOLD}6. YAML Integrity${NC}"
    check_yaml_syntax

    # ── Summary ──
    echo ""
    echo -e "${BOLD}═══════════════════════════════════════════════${NC}"
    echo -e "${BOLD}  Summary${NC}"
    echo -e "${BOLD}═══════════════════════════════════════════════${NC}"
    echo -e "  ${GREEN}Passed:${NC} $PASS"
    echo -e "  ${RED}Failed:${NC} $FAIL"
    echo -e "  ${YELLOW}Warnings:${NC} $WARN"
    echo ""

    if [ "$FAIL" -gt 0 ]; then
        echo -e "  ${RED}❌ VALIDATION FAILED${NC}"
        echo -e "  ${YELLOW}Resolve above failures before production deployment.${NC}"
        echo ""
        exit 1
    else
        echo -e "  ${GREEN}✅ ALL CHECKS PASSED${NC}"
        echo ""
        exit 0
    fi
}

main "$@"
