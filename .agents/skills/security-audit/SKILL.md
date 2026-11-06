---
name: security-audit
description: >-
  Comprehensive defensive security auditor for this project and its Vercel deployment.
  ACTIVELY TRIGGER whenever the user mentions security, vulnerabilities, hackers, OWASP,
  CVEs, leaked keys, secrets, headers, auth bugs, SQL injection, XSS, SSRF, CSRF, IDOR,
  rate limiting, pentesting, attack surface, exposure, breach, or asks if the code is safe
  to deploy or launch to production.
---

# Defensive Security Audit Agent

This skill conducts methodical, defensive-only security assessments of the Tenvi codebase and its Vercel production deployment against recognized security standards:
- **OWASP Top 10 (2021)**
- **OWASP API Security Top 10 (2023)**
- **OWASP Application Security Verification Standard (ASVS) Level 2**
- **CWE Top 25 Most Dangerous Software Weaknesses**

> [!IMPORTANT]
> **Strict Defensive Posture:**
> - **Zero Exploitation:** Do not generate active exploit payloads, fuzz endpoints, run brute-force attacks, or conduct denial-of-service tests.
> - **Owned Infrastructure Only:** Only inspect code in this repository and live endpoints explicitly confirmed as owned (`https://tenvi.vercel.app` or `http://localhost:3000`).
> - **Redact All Secrets:** Never display full secrets. Display only the first 4 characters, file, and line number (`abcd**** at src/lib/config:14`), and advise immediate key rotation.
> - **Evidence-Based:** Every finding must cite verified code references (`file:line`), scanner command output, or HTTP headers.
> - **Report First:** Present the full audit findings first. Only implement remediations when explicitly approved by the user, then re-run the assessment.
> - **No False Guarantees:** Never claim the system is "100% compliant" or "unhackable."

---

## 1. Audit Scope & 10 Verification Categories

1. **Reconnaissance & Entry Point Mapping:** Inspect `package.json`, lockfile, `proxy.ts`, `next.config.ts`, `vercel.json`. Map all Server Actions (`src/app/actions/`), Route Handlers (`src/app/api/`), edge proxies, cron endpoints, and auth callback routes.
2. **Access Control & Authorization:** Verify authentication (`requireWebsiteUser()`, `requireWebsiteAdmin()`) and multi-tenant authorization (`website_id: WEBSITE_ID`) on every Server Action and Route Handler. Ensure no auth logic is delegated solely to `proxy.ts` (mitigate IDOR / BOLA / BFLA).
3. **Secrets Management:** Audit git history and index for committed `.env*` files (`git ls-files`). Scan for hardcoded Supabase service role keys, API tokens, private keys, and server-only secrets leaked through `NEXT_PUBLIC_*` client variables.
4. **Injection Defenses:** Check for unescaped HTML (`dangerouslySetInnerHTML`), dynamic code execution (`eval()`, `new Function()`), SQL concatenation, and unsafe external URL fetching (SSRF).
5. **Authentication & Session Security:** Review password handling, Supabase session lifecycle, cookie attributes (`HttpOnly`, `Secure`, `SameSite=Lax/Strict`), and rate limiting on `/register` and `/login`.
6. **Dependency Vulnerability Assessment:** Run automated package dependency scanners (`npm audit`, `osv-scanner`) to detect known CVEs in runtime dependencies.
7. **Security Headers & Transport:** Verify HTTPS redirect, HSTS, CSP, X-Frame-Options (Clickjacking), X-Content-Type-Options (MIME sniffing), Referrer-Policy, Permissions-Policy, and CORS configurations.
8. **Vercel Runtime Configuration:** Audit cron route protection (`CRON_SECRET`), preview deployment security, environment variable scoping (Production vs Preview vs Development), and source map exposure (`productionBrowserSourceMaps`).
9. **Input Handling & Data Integrity:** Inspect Zod schema validation across all inputs, file upload types/sizes (receipt OCR), and integer monetary arithmetic.
10. **Security Logging & Privacy:** Verify mutation audit logging (`bili_audit_logs`) and ensure no plaintext passwords, bearer tokens, or PII are logged to console or remote monitoring.

---

## 2. Automated Diagnostic Tools

Run the included audit scripts:

```bash
# 1. Run local scanners & built-in heuristic security checks:
./scripts/run_scanners.sh

# 2. Run passive live deployment header & exposure check:
python3 scripts/check_headers.py https://tenvi.vercel.app
# Or for local development verification:
python3 scripts/check_headers.py http://localhost:3000
```

- [OWASP / ASVS L2 Detailed Checklist](file:///Users/jeunciano/Workstation/Tenvi/.agents/skills/security-audit/references/owasp_asvs_checklist.md)
- [Next.js 16 & Vercel Specific Checklist](file:///Users/jeunciano/Workstation/Tenvi/.agents/skills/security-audit/references/vercel_nextjs_checklist.md)

---

## 3. Required Report Output Structure

Every audit output must follow this structured template:

```markdown
# Tenvi Defensive Security Audit Report
**Target:** [Local Repository / Deployed URL]  
**Date:** [ISO Timestamp]  
**Scope:** OWASP Top 10, OWASP API Top 10, ASVS Level 2, CWE Top 25

## 1. Executive Summary
- Overall Posture: [High Risk / Moderate / Hardened]
- Total Findings: [X Critical, Y High, Z Medium, W Low, V Info]

## 2. Detailed Findings (Ordered Critical → High → Medium → Low → Info)
### [SEVERITY] Finding Title
- **Location:** `path/to/file.ts:line` or `Header Name`
- **Standard Reference:** OWASP [ID] / ASVS [Section] / CWE-[Number]
- **What's Wrong:** Concise explanation of the flaw.
- **Attacker Impact:** How an adversary could exploit this without providing functional exploit code.
- **Remediation:** Exact, minimal fix.
- **Status:** [Confirmed Vulnerable / Needs Verification / Remediation Pending]

## 3. OWASP Top 10 Coverage & Verification Matrix
| OWASP Category | Standard | Status | Notes |
| :--- | :--- | :--- | :--- |
| A01: Broken Access Control | ASVS V4.1 | Passed / Failed / Needs Verification | ... |
| A02: Cryptographic Failures | ASVS V6.2 | ... | ... |
| A03: Injection | ASVS V5.3 | ... | ... |
| A04: Insecure Design | ASVS V1.1 | ... | ... |
| A05: Security Misconfiguration | ASVS V14.4 | ... | ... |
| A06: Vulnerable Components | ASVS V14.2 | ... | ... |
| A07: Auth Failures | ASVS V2.1 | ... | ... |
| A08: Software/Data Integrity | ASVS V10.2 | ... | ... |
| A09: Security Logging | ASVS V7.1 | ... | ... |
| A10: SSRF | ASVS V5.5 | ... | ... |

## 4. Unverified & External Boundaries (Not Covered)
- List items that cannot be inspected via local code or passive probes (e.g., Supabase PostgreSQL RLS internal policies, Vercel Dashboard project settings, DNS provider DDoS filtering).

## 5. Next Steps & Recommended Automation
- Recommended automated gates (Dependabot, GitHub Secret Scanning, pre-release release audit checks).
```

---

## 4. Example Test Prompts

Use any of these prompts to test or invoke this skill:
1. *"Run a full defensive security audit on the codebase before we launch to production."*
2. *"Audit our Vercel deployment headers and check for leaked keys, open redirects, or IDOR vulnerabilities."*
3. *"Check our Next.js Server Actions and API routes against OWASP Top 10 and ASVS Level 2."*

