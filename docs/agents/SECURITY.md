# GhostKey — Security Log

Maintained by: Security Lead Agent + Dependency Scanner Agent
Findings are logged here. Resolved findings stay in the log with resolution noted.

---

## Active Findings

_None._

---

## Resolved Findings

_None._

---

## Acceptable Risk Suppressions

| CVE / Advisory | Suppressed | Justification | Added |
|----------------|-----------|---------------|-------|
| RUSTSEC-2023-0071 (rsa Marvin Attack) | `.cargo/audit.toml` | RSA crate is a transitive dep; server uses SQLite only — no RSA code path reachable | 2026-03-24 |

---

## Security Review Gates Status

### Phase 1 (Engine) — COMPLETE (as of v0.1.0–v0.3.0)
- [x] Auth endpoints rate limited — `DashMap` sliding window middleware; 10-req/window limit tested (SPEC-006 ✓)
- [x] No key material in logs — `keyHash` only stored/logged; raw key never handled server-side
- [x] SQL injection impossible — parameterized SQLx queries + SHA-256 credential hashing; SPEC-201 passing ✓
- [x] Session keys expire and are non-reusable — `ttlSeconds` enforced; `expiresAt` stored

### Phase 2 (SDK) — COMPLETE (as of v0.2.0–v0.3.0)
- [x] Private key never sent to server — `generateSessionKey()` returns `{ privateKey, keyHash }`; only `keyHash` goes in `SessionKeyRequest`
- [x] Session key stored in memory only — `useSessionKey` holds it in React state; never written to localStorage or cookies
- [ ] User confirmation required before any transaction — reference app shows the intent before sending; not yet enforced by SDK API (Phase 4 gate)

### Phase 4 (Hardening) — COMPLETE (as of v0.4.1)
- [x] Full rate limiting on all sensitive endpoints — auth (10/60s) + intent (10/60s); SPEC-035 ✓
- [x] Structured logs with no PII / key material — tracing + JSON log format in prod; `AppError::Internal` hides cause from API; SPEC-203 ✓
- [x] OWASP Top 10 review complete — see `docs/security-model.md`
- [x] Dependency audit complete — `cargo audit` + `npm audit` in CI; one suppressed advisory (RUSTSEC-2023-0071)
- [x] Security headers on all responses — X-Content-Type-Options, X-Frame-Options, Referrer-Policy; SPEC-200 ✓
- [x] X-Request-ID on all requests/responses — UUID per request; SPEC-201 ✓
- [x] Config-driven CORS — no wildcard; SPEC-202 ✓
- [x] Health 503 when DB is down — `GET /health` returns `503 Service Unavailable` on DB failure

### Phase 5 (Open Source Launch) — IN PROGRESS
- [ ] `docs/security-model.md` published (done — see file)
- [ ] SDK localStorage non-write assertion added (SPEC-100 ✓ — `sdk/tests/hooks.test.ts`)
