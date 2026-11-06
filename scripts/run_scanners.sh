#!/usr/bin/env bash
# ==============================================================================
# Tenvi Defensive Security Scanner Runner
# Standards: OWASP Top 10, OWASP API Top 10, ASVS L2, CWE Top 25
# Scope: Recon, Secrets, Injection, Access Control, Vercel Config, Dependencies
# ==============================================================================

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BOLD="\033[1m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
BLUE="\033[34m"
CYAN="\033[36m"
RESET="\033[0m"

echo -e "${BOLD}${BLUE}==============================================================================${RESET}"
echo -e "${BOLD}${BLUE}           TENVI DEFENSIVE SECURITY SCANNER (OWASP / ASVS L2 / CWE)           ${RESET}"
echo -e "${BOLD}${BLUE}==============================================================================${RESET}"
echo -e "Target Directory: ${CYAN}${ROOT_DIR}${RESET}"
echo -e "Timestamp:        $(date -u +"%Y-%m-%dT%H:%M:%SZ")\n"

# Helper for masking secrets: prints first 4 chars then ****
mask_secret() {
  local str="$1"
  local len=${#str}
  if [ "$len" -le 4 ]; then
    echo "****"
  else
    local prefix="${str:0:4}"
    echo "${prefix}**** (Length: ${len}) [ROTATE IMMEDIATELY]"
  fi
}

# ------------------------------------------------------------------------------
# 1. SCANNER TOOL AVAILABILITY CHECK & FALLBACK INSTALL INSTRUCTIONS
# ------------------------------------------------------------------------------
echo -e "${BOLD}[1/3] Checking External Security Scanners...${RESET}"

AUDIT_TOOL=""
if command -v pnpm &> /dev/null && [ -f "pnpm-lock.yaml" ]; then
  AUDIT_TOOL="pnpm audit"
elif command -v yarn &> /dev/null && [ -f "yarn.lock" ]; then
  AUDIT_TOOL="yarn audit"
elif command -v npm &> /dev/null; then
  AUDIT_TOOL="npm audit"
fi

if [ -n "$AUDIT_TOOL" ]; then
  echo -e "  [${GREEN}FOUND${RESET}] Package audit: ${CYAN}${AUDIT_TOOL}${RESET}"
else
  echo -e "  [${YELLOW}MISSING${RESET}] Package audit tool (npm/pnpm/yarn)"
fi

if command -v osv-scanner &> /dev/null; then
  echo -e "  [${GREEN}FOUND${RESET}] OSV-Scanner: ${CYAN}$(which osv-scanner)${RESET}"
else
  echo -e "  [${YELLOW}MISSING${RESET}] OSV-Scanner"
  echo -e "            Install via: ${CYAN}brew install osv-scanner${RESET} or ${CYAN}go install github.com/google/osv-scanner/cmd/osv-scanner@v1${RESET}"
fi

if command -v gitleaks &> /dev/null; then
  echo -e "  [${GREEN}FOUND${RESET}] Gitleaks: ${CYAN}$(which gitleaks)${RESET}"
else
  echo -e "  [${YELLOW}MISSING${RESET}] Gitleaks"
  echo -e "            Install via: ${CYAN}brew install gitleaks${RESET}"
fi

if command -v semgrep &> /dev/null; then
  echo -e "  [${GREEN}FOUND${RESET}] Semgrep: ${CYAN}$(which semgrep)${RESET}"
else
  echo -e "  [${YELLOW}MISSING${RESET}] Semgrep"
  echo -e "            Install via: ${CYAN}brew install semgrep${RESET} or ${CYAN}pip install semgrep${RESET}"
fi
echo ""

# ------------------------------------------------------------------------------
# 2. RUN INSTALLED SCANNERS
# ------------------------------------------------------------------------------
echo -e "${BOLD}[2/3] Running Installed External Scanners...${RESET}"

# A. Package Dependency Audit
if [ -n "$AUDIT_TOOL" ]; then
  echo -e "\n--- Running ${AUDIT_TOOL} ---"
  if [ "$AUDIT_TOOL" = "npm audit" ]; then
    npm audit --audit-level=moderate || true
  else
    $AUDIT_TOOL || true
  fi
fi

# B. OSV-Scanner
if command -v osv-scanner &> /dev/null; then
  echo -e "\n--- Running OSV-Scanner ---"
  osv-scanner --lockfile=package-lock.json . || true
fi

# C. Gitleaks
if command -v gitleaks &> /dev/null; then
  echo -e "\n--- Running Gitleaks (Git History & Files) ---"
  gitleaks detect --source=. --no-git=false --redact -v || true
fi

# D. Semgrep (OWASP Rulesets)
if command -v semgrep &> /dev/null; then
  echo -e "\n--- Running Semgrep (OWASP Top 10 ruleset) ---"
  semgrep --config p/owasp-top-ten --config p/javascript --quiet || true
fi
echo ""

# ------------------------------------------------------------------------------
# 3. BUILT-IN GREP & HEURISTIC SECURITY CHECKS (ALWAYS RUN)
# ------------------------------------------------------------------------------
echo -e "${BOLD}[3/3] Running Built-in Grep & Static Rule Checks...${RESET}\n"

FINDINGS_COUNT=0

record_finding() {
  local severity="$1"
  local rule="$2"
  local message="$3"
  local evidence="$4"
  FINDINGS_COUNT=$((FINDINGS_COUNT + 1))
  
  local color="$YELLOW"
  if [ "$severity" = "CRITICAL" ]; then color="$RED"; fi
  if [ "$severity" = "HIGH" ]; then color="$RED"; fi
  if [ "$severity" = "LOW" ]; then color="$CYAN"; fi
  if [ "$severity" = "INFO" ]; then color="$RESET"; fi

  echo -e "  ${BOLD}${color}[${severity}] ${rule}${RESET}"
  echo -e "    Description: ${message}"
  echo -e "    Evidence:    ${evidence}"
  echo ""
}

# ------------------------------------------------------------------------------
# Rule 3.1: Committed .env Files in Git Tracking
# Standard: ASVS V14.2 / CWE-538 / OWASP A05:2021
# ------------------------------------------------------------------------------
COMMITTED_ENVS=$(git ls-files | grep -E '^(\.env|\.env\.local|\.env\.production|\.env\.development)$' || true)
if [ -n "$COMMITTED_ENVS" ]; then
  record_finding "CRITICAL" "CWE-538 / ASVS V14.2" \
    "Committed environment file found in git index. Secrets may be permanently stored in git history." \
    "$COMMITTED_ENVS"
fi

# ------------------------------------------------------------------------------
# Rule 3.2: NEXT_PUBLIC_ Secrets Exposure
# Standard: ASVS V14.2 / CWE-312 / OWASP A02:2021
# ------------------------------------------------------------------------------
PUBLIC_SECRET_EXPOSURE=$(grep -rnE 'NEXT_PUBLIC_.*(SECRET|SERVICE_ROLE|PRIVATE|PASSWORD|DATABASE|TOKEN)' src/ .env.example 2>/dev/null | grep -v 'NEXT_PUBLIC_TURNSTILE_SITE_KEY' || true)
if [ -n "$PUBLIC_SECRET_EXPOSURE" ]; then
  record_finding "CRITICAL" "CWE-312 / ASVS V14.2" \
    "Potential secret exposed via client-facing NEXT_PUBLIC_* environment variable." \
    "$PUBLIC_SECRET_EXPOSURE"
fi

# ------------------------------------------------------------------------------
# Rule 3.3: Hardcoded Private Keys or Certificates in Code
# Standard: ASVS V14.2 / CWE-798 / OWASP A07:2021
# ------------------------------------------------------------------------------
PRIVATE_KEYS=$(grep -rnE '(BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY)' src/ 2>/dev/null || true)
if [ -n "$PRIVATE_KEYS" ]; then
  record_finding "CRITICAL" "CWE-798 / ASVS V14.2" \
    "Hardcoded private cryptographic key header detected in repository source files." \
    "$PRIVATE_KEYS"
fi

# ------------------------------------------------------------------------------
# Rule 3.4: Hardcoded Cloud or Third-Party API Keys / Tokens
# Standard: ASVS V14.2 / CWE-798 / OWASP A07:2021
# ------------------------------------------------------------------------------
HARDCODED_KEYS=$(grep -rnE '(AKIA[0-9A-Z]{16}|ghp_[0-9a-zA-Z]{36}|github_pat_[0-9a-zA-Z_]{82}|xox[baprs]-[0-9a-zA-Z]{10,48})' src/ 2>/dev/null || true)
if [ -n "$HARDCODED_KEYS" ]; then
  record_finding "CRITICAL" "CWE-798 / ASVS V14.2" \
    "High-confidence hardcoded cloud provider API key or PAT token detected." \
    "$HARDCODED_KEYS"
fi

# ------------------------------------------------------------------------------
# Rule 3.5: Hardcoded Supabase Service Role Key in Source Code
# Standard: ASVS V4.1 / CWE-798 / OWASP A01:2021
# ------------------------------------------------------------------------------
HARDCODED_SERVICE_ROLE=$(grep -rnE 'SUPABASE_SERVICE_ROLE_KEY\s*=\s*["'"'"']eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+' src/ 2>/dev/null || true)
if [ -n "$HARDCODED_SERVICE_ROLE" ]; then
  record_finding "CRITICAL" "CWE-798 / ASVS V4.1" \
    "Supabase Service Role Key bypass string hardcoded in application source code." \
    "$HARDCODED_SERVICE_ROLE"
fi

# ------------------------------------------------------------------------------
# Rule 3.6: Dangerously Set Inner HTML (XSS Sink)
# Standard: ASVS V5.3 / CWE-79 / OWASP A03:2021
# ------------------------------------------------------------------------------
DANGEROUS_HTML=$(grep -rn 'dangerouslySetInnerHTML' src/ 2>/dev/null || true)
if [ -n "$DANGEROUS_HTML" ]; then
  record_finding "HIGH" "CWE-79 / ASVS V5.3" \
    "Use of dangerouslySetInnerHTML detected. Ensure all markup is sanitized with DOMPurify." \
    "$DANGEROUS_HTML"
fi

# ------------------------------------------------------------------------------
# Rule 3.7: Eval or Dynamic Function Execution (Code Injection)
# Standard: ASVS V5.2 / CWE-94 / OWASP A03:2021
# ------------------------------------------------------------------------------
DYNAMIC_EVAL=$(grep -rnE '\b(eval\(|new Function\()' src/ 2>/dev/null || true)
if [ -n "$DYNAMIC_EVAL" ]; then
  record_finding "HIGH" "CWE-94 / ASVS V5.2" \
    "Dynamic code execution via eval() or new Function() detected." \
    "$DYNAMIC_EVAL"
fi

# ------------------------------------------------------------------------------
# Rule 3.8: TLS / SSL Verification Disabled
# Standard: ASVS V9.1 / CWE-295 / OWASP A02:2021
# ------------------------------------------------------------------------------
TLS_DISABLED=$(grep -rnE '(NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*["'"'"']?0["'"'"']?|rejectUnauthorized:\s*false)' src/ 2>/dev/null || true)
if [ -n "$TLS_DISABLED" ]; then
  record_finding "HIGH" "CWE-295 / ASVS V9.1" \
    "TLS certificate validation explicitly disabled." \
    "$TLS_DISABLED"
fi

# ------------------------------------------------------------------------------
# Rule 3.9: Unprotected Cron Routes (Missing Bearer / CRON_SECRET auth)
# Standard: ASVS V4.1 / CWE-862 / OWASP API1:2023 / A01:2021
# ------------------------------------------------------------------------------
if [ -d "src/app/api/cron" ]; then
  CRON_ROUTES=$(find src/app/api/cron -name "route.ts" -o -name "route.js")
  for route in $CRON_ROUTES; do
    if ! grep -qE '(CRON_SECRET|bearer|authorization)' "$route"; then
      record_finding "HIGH" "CWE-862 / ASVS V4.1" \
        "Vercel cron route appears to lack Bearer token or CRON_SECRET validation." \
        "$route"
    fi
  done
fi

# ------------------------------------------------------------------------------
# Rule 3.10: Server Actions Missing Authorization Guards
# Standard: ASVS V4.1 / CWE-862 / OWASP A01:2021
# ------------------------------------------------------------------------------
if [ -d "src/app/actions" ]; then
  SERVER_ACTION_FILES=$(find src/app/actions -name "*.ts" -o -name "*.tsx" | grep -v '.test.')
  for action_file in $SERVER_ACTION_FILES; do
    if grep -q "'use server'" "$action_file" || grep -q '"use server"' "$action_file"; then
      # Check if actions verify user session or admin rights
      if ! grep -qE '(requireWebsiteUser|requireWebsiteAdmin|getAuthenticatedUser|supabase\.auth\.getUser)' "$action_file"; then
        # Check if it's purely auth actions (login/signup) or public feedback
        if [[ ! "$action_file" =~ (auth\.ts|feedback\.ts) ]]; then
          record_finding "MEDIUM" "CWE-862 / ASVS V4.1" \
            "Server Action file does not appear to reference canonical auth guards (requireWebsiteUser / requireWebsiteAdmin)." \
            "$action_file"
        fi
      fi
    fi
  done
fi

# ------------------------------------------------------------------------------
# Rule 3.11: Multi-tenant Isolation Check (WEBSITE_ID enforcement)
# Standard: ASVS V4.1 / CWE-639 (IDOR) / OWASP API1:2023
# ------------------------------------------------------------------------------
MUTATION_ACTIONS=$(find src/app/actions -name "*.ts" ! -name "auth.ts" ! -name "*.test.ts" 2>/dev/null || true)
for f in $MUTATION_ACTIONS; do
  if grep -qE '\.insert\(|\.update\(|\.delete\(' "$f" 2>/dev/null; then
    if ! grep -q 'WEBSITE_ID' "$f"; then
      record_finding "MEDIUM" "CWE-639 / ASVS V4.1" \
        "Database mutation action may be missing tenant isolation (WEBSITE_ID scoping)." \
        "$f"
    fi
  fi
done

# ------------------------------------------------------------------------------
# SUMMARY
# ------------------------------------------------------------------------------
echo -e "${BOLD}${BLUE}==============================================================================${RESET}"
if [ "$FINDINGS_COUNT" -eq 0 ]; then
  echo -e "${BOLD}${GREEN}✔ All built-in static security heuristic checks passed with 0 findings!${RESET}"
else
  echo -e "${BOLD}${YELLOW}⚠ Built-in static checks completed with ${FINDINGS_COUNT} potential finding(s).${RESET}"
  echo -e "Review each item against business logic to confirm exploitability or intentional architecture."
fi
echo -e "${BOLD}${BLUE}==============================================================================${RESET}"

