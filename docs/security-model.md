# GhostKey Security Model

GhostKey is a non-custodial infrastructure layer. This document explains the security guarantees, threat model, and boundaries that define what GhostKey can and cannot do.

---

## Core Guarantee: Non-Custodial

**The GhostKey server never receives, stores, or handles private keys.**

This is a hard architectural constraint, not a policy. It is enforced at the API boundary:

- `POST /session-key/issue` accepts only `key_hash` (SHA-256 of the key) — the raw key is never sent
- `POST /account/create` accepts a pre-computed counterfactual address — the server does not generate or derive keys
- No recovery path grants the server access to user keys

If an attacker fully compromises the GhostKey server, they cannot move user funds. Session keys are scoped to specific targets, selectors, and value limits — all enforced server-side before any intent is submitted.

---

## Authentication

### JWT tokens

- Method: HMAC-SHA256 JWT signed with `JWT_SECRET`
- TTL: 1 hour (`exp` claim)
- Storage: in-memory only on the client (never localStorage, never cookies)
- Logout invalidation: `POST /auth/logout` adds the token's SHA-256 hash to the `token_denylist` database table; all subsequent requests bearing that token are rejected with `401 unauthorized`
- Blast radius of a stolen JWT: up to 1 hour of API access (reduced to zero on explicit logout), but no key access

### Rate limiting

- Auth endpoints: 10 requests / 60 seconds per IP
- Intent execution: 10 intents / 60 seconds per user
- Implemented via in-memory DashMap sliding window

---

## Session Keys

Session keys are the primary mechanism for scoping what on-chain actions a user or application can perform.

| Property | Enforcement |
|----------|------------|
| `allowed_targets` | Server validates target on every `POST /intent/execute` |
| `allowed_selectors` | Server validates calldata prefix (first 4 bytes) |
| `max_value_wei` | Server validates value on every intent |
| `ttl_seconds` | `expires_at` checked on every intent; expired session → 401 `session_expired` |

**Key material lifecycle:**
1. Client generates session key locally (`generateSessionKey()`)
2. Client computes `key_hash = SHA-256(privateKey)`
3. Client sends only `key_hash` to server
4. Private key lives in client memory only — never transmitted, never persisted

---

## Intent Execution Pipeline

```
Client → POST /intent/execute
         ↓
         Scope check (target, selector, value, expiry)
         ↓
         DB: INSERT intent (status=pending)
         ↓
         202 Accepted + intent_id
         ↓ (background)
         Pimlico sponsor → send → receipt poll
         ↓
         DB: UPDATE intent (status=confirmed|failed)
         ↓
         Client polls GET /intent/:id/status
```

The 202-then-poll pattern prevents HTTP timeouts on slow bundler responses. Intent status is owned by the server — the client cannot forge a confirmed status.

---

## OWASP Top 10 Coverage

| Risk | Mitigation |
|------|-----------|
| A01 Broken Access Control | Auth middleware on all routes; intent ownership check (403 on wrong owner) |
| A02 Cryptographic Failures | HMAC-SHA256 JWT; SHA-256 key hashing; no key material in DB |
| A03 Injection | Parameterized SQLx queries throughout; no string interpolation into SQL |
| A04 Insecure Design | Non-custodial by design; session key scoping; 202+poll prevents sync exploits |
| A05 Security Misconfiguration | Config-driven CORS (no wildcard in prod); security headers on all responses |
| A06 Vulnerable Components | `cargo audit` in CI; RUSTSEC-2023-0071 suppressed with justification |
| A07 Auth Failures | Rate limiting; short JWT TTL; JWT denylist on logout; session key expiry |
| A08 Software Integrity | CI gates; cargo lockfile; npm lockfile |
| A09 Logging Failures | Structured tracing logs; key material never logged; request IDs on all requests |
| A10 SSRF | No user-controlled URLs in server code; bundler/paymaster URLs are env-var config only |

---

## Security Headers

Every HTTP response includes:

| Header | Value |
|--------|-------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `X-Request-ID` | UUID (per-request, propagated to response) |

---

## CORS

Allowed origins are configured via `cors_origins` in `config.toml` (or env var `GHOSTKEY__SERVER__CORS_ORIGINS`). No wildcard origin is permitted in production configurations.

---

## Threat Model

### In scope (GhostKey defends against)

- Unauthorized API access (JWT auth + rate limiting + logout denylist)
- Session key misuse (scope enforcement on every intent)
- SQL injection (parameterized queries)
- Key material exfiltration via API (server never holds keys)
- XSS token theft (in-memory token storage)
- Brute force (rate limiting)
- Dependency vulnerabilities (cargo audit + npm audit in CI)

### Out of scope (not GhostKey's responsibility)

- Client device compromise (attacker with device access can read memory)
- User phishing (application layer, not infrastructure)
- Bundler/paymaster availability (Pimlico SLA; GhostKey marks intents `failed` on timeout)
- Base chain reorgs (application layer concern)

---

## Reporting Vulnerabilities

Security issues should be reported privately before public disclosure. See the project README for contact details.

Do not open public GitHub issues for security vulnerabilities.
