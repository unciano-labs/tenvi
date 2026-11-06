#!/usr/bin/env python3
"""
Tenvi Passive Live Deployment Security Header & Exposure Checker
Standards: OWASP Top 10 (A05:2021 Security Misconfiguration), OWASP ASVS V14, CWE-16/CWE-693

Usage:
    python3 scripts/check_headers.py https://tenvi.vercel.app
"""

import sys
import ssl
import urllib.request
import urllib.error
import urllib.parse
from http.client import HTTPResponse

# Terminal colors
BOLD = "\033[1m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
RED = "\033[31m"
BLUE = "\033[34m"
CYAN = "\033[36m"
GRAY = "\033[90m"
RESET = "\033[0m"

class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

class SecurityChecker:
    def __init__(self, target_url: str):
        if not target_url.startswith(("http://", "https://")):
            target_url = "https://" + target_url
        self.raw_target = target_url.rstrip("/")
        self.parsed = urllib.parse.urlparse(self.raw_target)
        self.base_url = f"{self.parsed.scheme}://{self.parsed.netloc}"
        self.findings = []
        self.ssl_context = ssl.create_default_context()

    def record(self, status: str, category: str, title: str, details: str, evidence: str = ""):
        self.findings.append({
            "status": status,  # PASS, WARN, FAIL, INFO
            "category": category,
            "title": title,
            "details": details,
            "evidence": evidence,
        })
        badge_color = GREEN if status == "PASS" else YELLOW if status == "WARN" else RED if status == "FAIL" else CYAN
        print(f"  {BOLD}{badge_color}[{status}]{RESET} {BOLD}{title}{RESET}")
        if details:
            print(f"    {GRAY}Note:{RESET} {details}")
        if evidence:
            print(f"    {GRAY}Evidence:{RESET} {evidence}")

    def fetch(self, url: str, headers: dict = None, method: str = "GET", follow_redirects: bool = True) -> tuple[int, dict, bytes]:
        req_headers = {
            "User-Agent": "Mozilla/5.0 (Defensive Security Audit; Tenvi)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }
        if headers:
            req_headers.update(headers)
        req = urllib.request.Request(url, headers=req_headers, method=method)
        try:
            if not follow_redirects:
                opener = urllib.request.build_opener(NoRedirectHandler)
                resp = opener.open(req, timeout=10)
                return resp.status, dict(resp.headers), resp.read()
            else:
                with urllib.request.urlopen(req, timeout=10, context=self.ssl_context) as response:
                    return response.status, dict(response.headers), response.read()
        except urllib.error.HTTPError as e:
            return e.code, dict(e.headers), e.read()
        except Exception as e:
            return 0, {}, str(e).encode()

    def check_https_redirect(self):
        print(f"\n{BOLD}[1/5] Checking HTTPS Enforcement...{RESET}")
        http_url = f"http://{self.parsed.netloc}"
        status, headers, _ = self.fetch(http_url, method="HEAD", follow_redirects=False)
        
        location = headers.get("Location") or headers.get("location")
        if status in (301, 302, 307, 308) and location and location.startswith("https://"):
            self.record("PASS", "Transport", "HTTPS Redirection Enforced",
                        f"HTTP requests redirect to HTTPS via HTTP {status}", f"Location: {location}")
        elif status == 0:
            self.record("INFO", "Transport", "Port 80 Inaccessible or Filtered",
                        "Could not connect via plain HTTP (server may only bind port 443)")
        else:
            self.record("FAIL", "Transport", "Plain HTTP Not Redirecting to HTTPS",
                        f"Expected 301/308 redirect, got HTTP {status}", f"Status: {status}")

    def check_headers(self):
        print(f"\n{BOLD}[2/5] Inspecting HTTP Security Headers...{RESET}")
        status, headers, _ = self.fetch(self.base_url)
        headers_lower = {k.lower(): v for k, v in headers.items()}

        # 1. Strict-Transport-Security (HSTS)
        hsts = headers_lower.get("strict-transport-security")
        if hsts:
            has_subdomains = "includesubdomains" in hsts.lower()
            has_preload = "preload" in hsts.lower()
            if has_subdomains and "max-age=" in hsts:
                self.record("PASS", "Headers", "Strict-Transport-Security (HSTS) Active",
                            "Enforces HTTPS for domain and all subdomains", f"HSTS: {hsts}")
            else:
                self.record("WARN", "Headers", "HSTS Present but Weak Configuration",
                            "Consider adding 'includeSubDomains' and setting max-age >= 31536000", f"HSTS: {hsts}")
        else:
            self.record("FAIL", "Headers", "Missing Strict-Transport-Security (HSTS)",
                        "Mitigates SSL stripping and man-in-the-middle attacks (ASVS V9.2 / CWE-523)")

        # 2. Content-Security-Policy (CSP)
        csp = headers_lower.get("content-security-policy")
        csp_report = headers_lower.get("content-security-policy-report-only")
        if csp:
            if "default-src" in csp or "script-src" in csp:
                self.record("PASS", "Headers", "Content-Security-Policy (CSP) Active",
                            "Restricts unauthorized script execution and object embedding", f"CSP: {csp[:100]}...")
            else:
                self.record("WARN", "Headers", "CSP Configured but Missing Key Directives",
                            "Ensure 'default-src' or 'script-src' is explicitly constrained", f"CSP: {csp}")
        elif csp_report:
            self.record("WARN", "Headers", "Content-Security-Policy in Report-Only Mode",
                        "Violations are logged but not enforced", f"CSP-Report-Only: {csp_report[:100]}...")
        else:
            self.record("WARN", "Headers", "Missing Content-Security-Policy (CSP)",
                        "Crucial defense-in-depth against XSS and data exfiltration (ASVS V14.4 / CWE-1021)")

        # 3. Anti-Clickjacking: X-Frame-Options or frame-ancestors
        xfo = headers_lower.get("x-frame-options")
        has_frame_ancestors = csp and "frame-ancestors" in csp
        if has_frame_ancestors or (xfo and xfo.upper() in ("DENY", "SAMEORIGIN")):
            evidence = f"X-Frame-Options: {xfo}" if xfo else "CSP frame-ancestors directive present"
            self.record("PASS", "Headers", "Clickjacking Protection Active",
                        "Framing restricted against UI redressing attacks", evidence)
        else:
            self.record("FAIL", "Headers", "Missing Anti-Clickjacking Protection",
                        "Neither X-Frame-Options nor CSP frame-ancestors is present (CWE-1021)")

        # 4. X-Content-Type-Options
        xcto = headers_lower.get("x-content-type-options")
        if xcto and "nosniff" in xcto.lower():
            self.record("PASS", "Headers", "X-Content-Type-Options: nosniff Active",
                        "Prevents browser MIME-type sniffing", f"X-Content-Type-Options: {xcto}")
        else:
            self.record("FAIL", "Headers", "Missing X-Content-Type-Options: nosniff",
                        "Allows browsers to sniff away from declared content-type (ASVS V14.4 / CWE-430)")

        # 5. Referrer-Policy
        ref = headers_lower.get("referrer-policy")
        if ref and any(safe in ref.lower() for safe in ("strict-origin", "no-referrer", "same-origin")):
            self.record("PASS", "Headers", "Referrer-Policy Configured Safely",
                        "Prevents leakage of sensitive URL path or query params", f"Referrer-Policy: {ref}")
        else:
            self.record("WARN", "Headers", "Suboptimal or Missing Referrer-Policy",
                        "Recommend 'strict-origin-when-cross-origin' or 'no-referrer'", f"Current: {ref or 'None'}")

        # 6. Permissions-Policy
        perm = headers_lower.get("permissions-policy")
        if perm:
            self.record("PASS", "Headers", "Permissions-Policy Active",
                        "Disables unneeded browser APIs (camera, microphone, geolocation)", f"Permissions-Policy: {perm[:80]}...")
        else:
            self.record("WARN", "Headers", "Missing Permissions-Policy",
                        "Restricts device hardware access if compromised (ASVS V14.4)")

        # 7. Server Fingerprinting Leakage
        server = headers_lower.get("server")
        powered_by = headers_lower.get("x-powered-by")
        if powered_by:
            self.record("WARN", "Headers", "X-Powered-By Banner Leaked",
                        "Reveals framework technology stack to attackers", f"X-Powered-By: {powered_by}")
        else:
            self.record("PASS", "Headers", "X-Powered-By Header Hidden",
                        "No framework technology banner leaked")

        if server and any(x in server.lower() for x in ("nginx/", "apache/", "express")):
            self.record("WARN", "Headers", "Detailed Server Version Leaked",
                        "Software versions should be hidden in production", f"Server: {server}")

    def check_cookies(self):
        print(f"\n{BOLD}[3/5] Inspecting Session Cookies & Security Flags...{RESET}")
        status, headers, _ = self.fetch(self.base_url)
        # Collect all Set-Cookie headers
        cookies = []
        for k, v in headers.items():
            if k.lower() == "set-cookie":
                cookies.append(v)
        
        if not cookies:
            self.record("INFO", "Cookies", "No Set-Cookie Headers on Public Landing Page",
                        "Authentication cookies are typically set on /login or session creation routes.")
            return

        for cookie in cookies:
            cookie_name = cookie.split("=")[0].strip()
            cookie_lower = cookie.lower()
            
            # HttpOnly
            if "httponly" in cookie_lower:
                self.record("PASS", "Cookies", f"Cookie '{cookie_name}' has HttpOnly",
                            "Prevents client-side JavaScript access via XSS")
            else:
                self.record("WARN", "Cookies", f"Cookie '{cookie_name}' Missing HttpOnly Flag",
                            "Cookie accessible to client scripts; vulnerable to XSS exfiltration (ASVS V3.4 / CWE-1004)")

            # Secure
            if "secure" in cookie_lower:
                self.record("PASS", "Cookies", f"Cookie '{cookie_name}' has Secure Flag",
                            "Transmitted exclusively over TLS encrypted channels")
            else:
                self.record("FAIL", "Cookies", f"Cookie '{cookie_name}' Missing Secure Flag",
                            "Can be transmitted over cleartext HTTP (ASVS V3.4 / CWE-614)")

            # SameSite
            if "samesite=strict" in cookie_lower or "samesite=lax" in cookie_lower:
                self.record("PASS", "Cookies", f"Cookie '{cookie_name}' has Safe SameSite Attribute",
                            "Mitigates Cross-Site Request Forgery (CSRF)")
            else:
                self.record("WARN", "Cookies", f"Cookie '{cookie_name}' Missing Strict/Lax SameSite",
                            "May be vulnerable to cross-site request context attacks (ASVS V3.4 / CWE-1275)")

    def check_cors(self):
        print(f"\n{BOLD}[4/5] Testing CORS Cross-Origin Policies...{RESET}")
        cors_headers = {
            "Origin": "https://evil-attacker-site.com",
            "Access-Control-Request-Method": "POST",
        }
        status, headers, _ = self.fetch(self.base_url, headers=cors_headers, method="OPTIONS")
        headers_lower = {k.lower(): v for k, v in headers.items()}
        
        allow_origin = headers_lower.get("access-control-allow-origin")
        allow_cred = headers_lower.get("access-control-allow-credentials")

        if allow_origin == "*":
            if allow_cred and allow_cred.lower() == "true":
                self.record("CRITICAL", "CORS", "Dangerous CORS: Wildcard with Credentials",
                            "Browser allows arbitrary domains to read authenticated responses (CWE-942 / OWASP API7)")
            else:
                self.record("INFO", "CORS", "Public CORS Wildcard (*)",
                            "Permitted on public static resources without credentials")
        elif allow_origin == "https://evil-attacker-site.com":
            self.record("FAIL", "CORS", "Arbitrary Origin Reflection in CORS",
                            "Backend dynamically reflects untrusted Origin header (CWE-942)")
        elif allow_origin:
            self.record("PASS", "Headers", "CORS Origin Whitelisted",
                        f"Explicit origin policy: {allow_origin}")
        else:
            self.record("PASS", "CORS", "No Overly Permissive CORS Headers Found",
                        "Default same-origin policy is enforced.")

    def check_public_exposures(self):
        print(f"\n{BOLD}[5/5] Checking Sensitive File & Repository Exposures...{RESET}")
        sensitive_paths = [
            ("/.env", "Environment Variables File"),
            ("/.env.local", "Local Environment Configuration"),
            ("/.env.production", "Production Environment Configuration"),
            ("/.git/HEAD", "Git Repository Metadata"),
            ("/.git/config", "Git Configuration File"),
        ]

        for path, desc in sensitive_paths:
            test_url = f"{self.base_url}{path}"
            status, headers, content = self.fetch(test_url)
            content_str = content.decode("utf-8", errors="ignore")

            # Check if truly exposed (200 OK and not a Next.js 404 HTML fallback)
            if status == 200:
                is_html_fallback = "<!doctype html" in content_str.lower() or "<html" in content_str.lower()
                is_git = "ref: refs/" in content_str or "[core]" in content_str
                is_env = "=" in content_str and not is_html_fallback and any(k in content_str for k in ("KEY", "SECRET", "URL", "DATABASE"))

                if is_git or is_env:
                    self.record("CRITICAL", "Exposure", f"CRITICAL LEAK: {desc} is Publicly Accessible!",
                                f"Accessing {path} returned sensitive file content (HTTP 200).",
                                f"Sample preview: {content_str[:40]}...")
                elif not is_html_fallback:
                    self.record("WARN", "Exposure", f"Unusual 200 OK for {path}",
                                "Endpoint returned HTTP 200 without standard 404 HTML document.",
                                f"Length: {len(content)} bytes")
                else:
                    self.record("PASS", "Exposure", f"{path} Safely Not Accessible",
                                "Server correctly returned SPA/404 HTML error page.")
            else:
                self.record("PASS", "Exposure", f"{path} Not Accessible",
                            f"Server returned HTTP {status}")

    def summarize(self):
        print(f"\n{BOLD}{BLUE}=============================================================================={RESET}")
        print(f"{BOLD}{BLUE}                             AUDIT SUMMARY REPORT                             {RESET}")
        print(f"{BOLD}{BLUE}=============================================================================={RESET}")
        
        counts = {"CRITICAL": 0, "FAIL": 0, "WARN": 0, "PASS": 0, "INFO": 0}
        for f in self.findings:
            counts[f["status"]] = counts.get(f["status"], 0) + 1

        print(f"Target:   {self.raw_target}")
        print(f"Results:  {RED}{counts['CRITICAL']} Critical{RESET} | {RED}{counts['FAIL']} High/Failed{RESET} | {YELLOW}{counts['WARN']} Medium/Warnings{RESET} | {GREEN}{counts['PASS']} Passed{RESET} | {CYAN}{counts['INFO']} Info{RESET}\n")

        if counts["CRITICAL"] > 0:
            print(f"{BOLD}{RED}CRITICAL ACTION REQUIRED: Immediate remediation needed before launch.{RESET}")
        elif counts["FAIL"] > 0:
            print(f"{BOLD}{YELLOW}ATTENTION NEEDED: Address missing security headers in next.config.ts / vercel.json.{RESET}")
        else:
            print(f"{BOLD}{GREEN}✔ Clean assessment. All live transport and configuration safeguards active.{RESET}")
        print(f"{BOLD}{BLUE}=============================================================================={RESET}\n")

def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print("Usage: python3 scripts/check_headers.py <target_url>")
        print("Example: python3 scripts/check_headers.py https://tenvi.vercel.app")
        sys.exit(1)

    url = sys.argv[1]
    checker = SecurityChecker(url)
    checker.check_https_redirect()
    checker.check_headers()
    checker.check_cookies()
    checker.check_cors()
    checker.check_public_exposures()
    checker.summarize()

if __name__ == "__main__":
    main()
