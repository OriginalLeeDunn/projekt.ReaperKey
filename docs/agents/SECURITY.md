# GhostKey — Security Log

Maintained by: Security Lead Agent + Dependency Scanner Agent
Findings are logged here. Resolved findings stay in the log with resolution noted.

---

## Active Findings

_None yet — project in Phase 0._

---

## Resolved Findings

_None yet._

---

## Acceptable Risk Suppressions

_None yet. Any suppressed CVE or known risk must be logged here with justification._

---

## Security Review Gates Status

### Phase 1 (Engine) — NOT YET STARTED
- [ ] Auth endpoints rate limited
- [ ] No key material in logs
- [ ] SQL injection impossible (parameterized queries only)
- [ ] Session keys expire and are non-reusable

### Phase 2 (SDK) — NOT YET STARTED
- [ ] Private key never sent to server
- [ ] Session key stored in memory or secure browser storage only
- [ ] User confirmation required before any transaction

### Phase 4 (Hardening) — NOT YET STARTED
- [ ] Full rate limiting on all sensitive endpoints
- [ ] Structured logs with no PII / key material
- [ ] OWASP Top 10 review complete
- [ ] Dependency audit complete
- [ ] Pentest report reviewed and findings resolved
