# Next.js 16 & Vercel Defensive Security Checklist

This reference covers security architecture, configuration, and threat vectors specific to Next.js 16 (App Router, Server Actions, `proxy.ts`) and Vercel deployments.

---

## 1. Next.js 16 Entry Point Architecture & Access Control

### A. Server Actions (`'use server'`)
> [!IMPORTANT]
> **Every exported Server Action is a public HTTP POST endpoint.**
> An attacker can invoke any exported server action directly with `curl` or Postman, bypassing client-side button disables, UI forms, or client route transitions.

- **Checklist:**
  - [ ] **Direct Authorization:** Every Server Action must independently verify the caller's session on the server (e.g., `const auth = await requireWebsiteUser()`).
  - [ ] **Role Verification:** Admin actions must verify administrative privileges (e.g., `await requireWebsiteAdmin()`).
  - [ ] **No Reliance on Middleware:** Never assume `proxy.ts` protected the request.
  - [ ] **Tenant Isolation:** Every database mutation and query MUST scope to `website_id: WEBSITE_ID` and `user_id: auth.user.id`.
  - [ ] **Strict Input Validation:** All arguments must be validated with Zod `safeParse()`. Never pass raw input directly to Supabase or SQL.
  - [ ] **Mutation Audit Logging:** Critical mutations must record audit entries via `logAuditEntry()`.

### B. Route Handlers (`src/app/api/**/route.ts`)
- **Checklist:**
  - [ ] **Authentication Check:** Any endpoint returning user or organizational data must verify the session.
  - [ ] **Method Restriction:** Only declare exported HTTP methods (`GET`, `POST`, `PUT`, `DELETE`) intended for use.
  - [ ] **CORS Scoping:** If setting CORS headers, never reflect untrusted `Origin` headers or combine `Access-Control-Allow-Origin: *` with `Access-Control-Allow-Credentials: true`.
  - [ ] **Safe Errors:** Catch exceptions and return generic error messages (e.g., `Internal Server Error`) rather than leaking database error strings or raw stack traces.

### C. Edge Proxy (`src/proxy.ts`)
- Next.js 16 uses `src/proxy.ts` (replacing legacy `middleware.ts`).
- **Checklist:**
  - [ ] **Session Refresh:** Refreshes Supabase session tokens via cookies.
  - [ ] **Route Redirection:** Unauthenticated users trying to access `/dashboard*` or `/admin*` are redirected to `/login`.
  - [ ] **Defense in Depth:** Treat `proxy.ts` as a routing guard for user experience, NOT the sole authorization barrier.

---

## 2. Secrets & Supabase Security Boundaries

### A. Environment Variable Scoping
- [ ] **`NEXT_PUBLIC_*` Audit:**
  - Only variables explicitly intended for public browser consumption may carry `NEXT_PUBLIC_` (e.g., `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`).
  - **BANNED:** Never prefix database passwords, secret keys, or API tokens with `NEXT_PUBLIC_`.
- [ ] **Server Secrets:**
  - `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `CRON_SECRET`, `TURNSTILE_SECRET_KEY`, `SMTP_PASS` must be accessed strictly in server modules (`'use server'` or Route Handlers).
- [ ] **Git Exclusion:**
  - Verify `.env*` files are strictly excluded via `.gitignore`.
  - Check that `.env.local`, `.env.production`, `.env.development` have zero commit history in git.

### B. Supabase Client Isolation
- [ ] **Browser Client (`@/lib/supabase/client`):** Uses anonymous public key; constrained by PostgreSQL Row Level Security (RLS).
- [ ] **Server Client (`@/lib/supabase/server`):** Uses cookie-based session; constrained by PostgreSQL RLS.
- [ ] **Admin Service Role Client (`createAdminClient`):** Bypasses all RLS policies.
  - Audit every usage: must ONLY be invoked in trusted server contexts (e.g. system onboarding, automated background cron, admin broadcasts).
  - Never expose methods wrapping `createAdminClient` directly to untrusted client calls without strict authorization.

---

## 3. Vercel Deployment & Runtime Hardening

### A. Cron Route Protection (`vercel.json`)
- Vercel invokes scheduled cron jobs via HTTP requests to `/api/cron/*`.
- **Threat:** If unauthenticated, anyone can trigger repeated runs, exhausting API quotas (Gemini, SMS) or corrupting state.
- **Verification Rule:**
  ```typescript
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  ```

### B. Security Headers in `next.config.ts`
- Ensure standard security headers are declared in `next.config.ts` via `async headers()`:
  - `Strict-Transport-Security`: `max-age=63072000; includeSubDomains; preload`
  - `X-Frame-Options`: `DENY` (or CSP `frame-ancestors 'none'`)
  - `X-Content-Type-Options`: `nosniff`
  - `Referrer-Policy`: `strict-origin-when-cross-origin`
  - `Permissions-Policy`: restrict camera, microphone, geolocation
  - `Content-Security-Policy`: define approved script, style, image, and connect sources.
- **Hide Framework Fingerprinting:** Set `poweredByHeader: false` in `next.config.ts` to omit `X-Powered-By: Next.js`.

### C. Source Map Protection
- [ ] Verify `productionBrowserSourceMaps: false` in `next.config.ts` (the default). Enabling production browser source maps publishes all unminified TypeScript source code directly to browser DevTools.

### D. Vercel Preview Deployment Protection
- [ ] In Vercel Project Settings > Deployment Protection, ensure Vercel Authentication or password protection is enabled on Preview Deployments to prevent indexing and public access to work-in-progress branches.

