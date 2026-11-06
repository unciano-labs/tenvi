# OWASP Top 10, API Security Top 10, ASVS Level 2 & CWE Top 25 Security Checklist

This reference maps defensive security audit checks against recognized industry standards. Every finding reported by the `security-audit` skill must reference at least one standard identifier from this document.

---

## 1. OWASP Top 10 (2021) Mapping

| ID | Category | Key Verification Checks | Primary CWEs | ASVS L2 Section |
| :--- | :--- | :--- | :--- | :--- |
| **A01:2021** | **Broken Access Control** | Object-level auth on all routes/mutations (no IDOR); no auth solely in middleware/proxy; principle of least privilege; tenant isolation (`website_id`). | CWE-22, CWE-284, CWE-285, CWE-639, CWE-862 | V4.1, V4.2, V4.3 |
| **A02:2021** | **Cryptographic Failures** | TLS 1.3/1.2 enforced; no plain HTTP; strong hashing (Argon2id/bcrypt); no hardcoded secrets/salts; sensitive data encrypted at rest (AES-256-GCM); no secrets in `NEXT_PUBLIC_*`. | CWE-259, CWE-312, CWE-327, CWE-330 | V6.2, V8.2, V9.1, V14.2 |
| **A03:2021** | **Injection** | Parameterized SQL/ORM; no dynamic SQL concatenation; XSS prevention (React escaping, no raw `dangerouslySetInnerHTML`); command injection prevention (`child_process` inputs); safe deserialization. | CWE-78, CWE-79, CWE-89, CWE-94 | V5.1, V5.2, V5.3 |
| **A04:2021** | **Insecure Design** | Threat modeling; rate limiting on authentication and sensitive mutations; bot defenses (CAPTCHA/Turnstile); anti-automation controls. | CWE-209, CWE-256, CWE-522, CWE-799 | V1.1, V2.2, V11.1 |
| **A05:2021** | **Security Misconfiguration** | Security headers configured (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy); default credentials disabled; error stack traces masked in production; CORS strictly scoped. | CWE-16, CWE-209, CWE-430, CWE-1021 | V14.1, V14.2, V14.4 |
| **A06:2021** | **Vulnerable & Outdated Components** | Dependencies scanned via `npm audit` / `osv-scanner`; no known critical/high CVEs in runtime packages; lockfile committed; automated dependency scanning. | CWE-1104, CWE-1395 | V14.2 |
| **A07:2021** | **Identification & Authentication Failures** | Strong password policies; brute-force protection (rate limiting); session fixation defense; secure cookies (`HttpOnly`, `Secure`, `SameSite`); multi-factor auth supported. | CWE-287, CWE-307, CWE-384, CWE-798 | V2.1, V2.2, V3.2, V3.4 |
| **A08:2021** | **Software & Data Integrity Failures** | Integrity of npm packages verified via lockfile; untrusted deserialization blocked; CI/CD pipeline integrity; CSP hash/nonce validation for inline scripts. | CWE-494, CWE-502, CWE-829 | V10.2, V14.2 |
| **A09:2021** | **Security Logging & Monitoring Failures** | Mutation audit logging (`bili_audit_logs`); security events (failed logins, rate limit triggers, auth anomalies) recorded; no PII/passwords/tokens logged. | CWE-778, CWE-117 | V7.1, V7.2, V7.3 |
| **A10:2021** | **Server-Side Request Forgery (SSRF)** | Server-side URL fetching strictly validated against URL allowlists; loopback/private IP ranges (`127.0.0.1`, `169.254.169.254`, `10.0.0.0/8`, `192.168.0.0/16`) blocked. | CWE-918 | V5.5 |

---

## 2. OWASP API Security Top 10 (2023) Mapping

| ID | Name | Focus & Audit Verification | Primary CWE |
| :--- | :--- | :--- | :--- |
| **API1:2023** | **Broken Object Level Authorization (BOLA)** | User A cannot access or mutate User B's resources by swapping IDs in requests. Verify tenant & user ID checks on all Server Actions and Route Handlers. | CWE-639 |
| **API2:2023** | **Broken Authentication** | Credential stuffing defenses; token expiry; invalidation on logout; secure session cookies. | CWE-287 |
| **API3:2023** | **Broken Object Property Level Authorization (BOPLA)** | Mass assignment prevention: only validated schema fields written to DB (no raw `req.body` pass-through to SQL/Supabase). | CWE-915 |
| **API4:2023** | **Unrestricted Resource Consumption** | Request body size limits; pagination limits (no unpaginated `listUsers` or `select('*')`); file upload limits. | CWE-770 |
| **API5:2023** | **Broken Function Level Authorization (BFLA)** | Administrative routes (`/admin/*`) and actions verify `requireWebsiteAdmin()` on the server, not just client-side rendering. | CWE-862 |
| **API6:2023** | **Unrestricted Access to Sensitive Business Flows** | Rate limiting and Turnstile CAPTCHA on registration, login, and high-frequency business actions. | CWE-799 |
| **API7:2023** | **Server Side Request Forgery (SSRF)** | Restrict endpoints that fetch external media, webhooks, or OCR documents to allowed domains and MIME types. | CWE-918 |
| **API8:2023** | **Security Misconfiguration** | CORS headers; debug modes; verbose stack traces returned in API JSON responses. | CWE-16 |
| **API9:2023** | **Improper Inventory Management** | Undocumented/deprecated API endpoints, staging routes, or sandbox routes exposed in production builds. | CWE-1059 |
| **API10:2023** | **Unsafe Consumption of APIs** | Third-party API responses (Gemini, httpSMS, SMTP) validated before processing and storage. | CWE-20 |

---

## 3. OWASP ASVS Level 2 Verification Matrix

ASVS Level 2 applies to applications that handle sensitive transactions, business data, and personally identifiable information (PII).

| ASVS Section | Verification Target | Requirement Summary |
| :--- | :--- | :--- |
| **V1: Architecture** | Security Architecture | Verify multi-tenant isolation boundaries, role models, and defense-in-depth layers. |
| **V2: Authentication** | Credential & Auth Controls | Verify rate limits, password rules, account enumeration defenses, and bot protection. |
| **V3: Session Management** | Session Security | Verify cookie flags (`HttpOnly`, `Secure`, `SameSite=Lax/Strict`), session rotation, and logout invalidation. |
| **V4: Access Control** | Authorization & Least Privilege | Verify that every Server Action and Route Handler executes explicit server-side authorization checks. |
| **V5: Validation & Sanitization** | Input Validation | Verify Zod schema validation on all inputs, character escaping, and file upload validation. |
| **V6: Cryptography** | Cryptographic Storage | Verify standard algorithms (AES-256-GCM, PBKDF2/Argon2/bcrypt) and no hardcoded secret keys. |
| **V7: Error Handling & Logging** | Audit Trails & Privacy | Verify security audit logging without recording passwords, session tokens, or plaintext PII. |
| **V8: Data Protection** | Sensitive Data Protection | Verify caching headers (`no-store` on sensitive endpoints), data minimization, and soft-delete protection. |
| **V9: Communications** | Transport Layer Security | Verify HSTS, HTTPS redirection, and rejection of insecure cipher suites or unencrypted channels. |
| **V10: Malicious Code** | Code Integrity | Verify third-party library integrity, dependency vulnerability status, and no dynamic code generation. |
| **V13: API & Web Services** | API Security | Verify schema enforcement, JSON content-type restrictions, and rate limiting per user/IP. |
| **V14: Configuration** | Build & Deployment Hygiene | Verify security headers, removal of debug/testing routes, source map protection, and environment variable separation. |

---

## 4. CWE Top 25 Most Dangerous Software Weaknesses

The following CWEs represent the highest-frequency, highest-impact vulnerabilities to check during every audit:

1. **CWE-79:** Improper Neutralization of Input During Web Page Generation (Cross-site Scripting / XSS)
2. **CWE-89:** Improper Neutralization of Special Elements used in an SQL Command (SQL Injection)
3. **CWE-20:** Improper Input Validation
4. **CWE-22:** Improper Limitation of a Pathname to a Restricted Directory (Path Traversal)
5. **CWE-352:** Cross-Site Request Forgery (CSRF)
6. **CWE-78:** Improper Neutralization of Special Elements used in an OS Command (OS Command Injection)
7. **CWE-287:** Improper Authentication
8. **CWE-862:** Missing Authorization
9. **CWE-639:** Authorization Bypass Through User-Controlled Key (IDOR / Insecure Direct Object Reference)
10. **CWE-798:** Use of Hard-coded Credentials
11. **CWE-918:** Server-Side Request Forgery (SSRF)
12. **CWE-306:** Missing Authentication for Critical Function
13. **CWE-502:** Deserialization of Untrusted Data
14. **CWE-269:** Improper Privilege Management
15. **CWE-94:** Improper Control of Generation of Code (Code Injection)
16. **CWE-434:** Unrestricted Upload of File with Dangerous Type
17. **CWE-312:** Cleartext Storage of Sensitive Information
18. **CWE-522:** Insufficiently Protected Credentials
19. **CWE-942:** Permissive Cross-Domain Policy with Untrusted Domains (CORS Misconfiguration)
20. **CWE-1021:** Improper Restriction of Rendered UI Layers or Frames (Clickjacking)
21. **CWE-770:** Allocation of Resources Without Limits or Throttling
22. **CWE-295:** Improper Certificate Validation
23. **CWE-117:** Improper Output Handling for Logs (Log Injection)
24. **CWE-209:** Generation of Error Message Containing Sensitive Information
25. **CWE-1275:** Sensitive Cookie with Improper SameSite Attribute

