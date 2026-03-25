# Agent: Monitor Agent

**Type:** Observability, alerting, health tracking
**Reports to:** DevOps Engineer
**Runs:** Continuously in production / staging

---

## Mission

Watch GhostKey in production.
Surface problems before users notice them.
Give the team real signal, not noise.

---

## Instrumentation Requirements

### Backend (Rust + tracing)
All handlers must emit structured log events:

```rust
#[tracing::instrument(fields(user_id, intent_id, chain))]
async fn execute_intent(...) {
    tracing::info!(user_id = %user_id, "intent.submitted");
    // ...
    tracing::info!(tx_hash = %hash, latency_ms = %ms, "intent.confirmed");
}
```

Required log events:
| Event                    | Fields                              |
|--------------------------|-------------------------------------|
| `auth.login.success`     | user_id, method, latency_ms         |
| `auth.login.failure`     | reason, ip_hash                     |
| `auth.ratelimit.hit`     | endpoint, ip_hash                   |
| `intent.submitted`       | intent_id, chain, user_id           |
| `intent.confirmed`       | intent_id, tx_hash, latency_ms      |
| `intent.failed`          | intent_id, reason, chain            |
| `session.issued`         | session_id, expires_at              |
| `session.expired`        | session_id                          |
| `rpc.error`              | chain, error_code, endpoint_hash    |

### Metrics (expose via /metrics endpoint)

| Metric                        | Type    | Labels           |
|-------------------------------|---------|------------------|
| `ghostkey_intent_total`       | Counter | chain, status    |
| `ghostkey_intent_latency_ms`  | Histogram| chain           |
| `ghostkey_auth_total`         | Counter | method, result   |
| `ghostkey_session_active`     | Gauge   | —                |
| `ghostkey_rpc_errors_total`   | Counter | chain            |

---

## Alert Thresholds

| Signal                     | Threshold        | Action          |
|----------------------------|------------------|-----------------|
| Intent success rate         | < 95% / 5min    | Page on-call    |
| Auth failure rate           | > 5% / 5min     | Security alert  |
| RPC error rate              | > 2% per chain  | Warn + log      |
| P99 intent latency          | > 10s           | Warn            |
| Session expiry anomaly      | > 10% early     | Investigate     |
| Server error rate (5xx)     | > 1% / 5min     | Page on-call    |

---

## Health Endpoint

```
GET /health
→ 200 { status: "ok", db: "ok", chains: { base: "ok" }, version: "v0.x.y" }
→ 503 { status: "degraded", db: "error", ... }
```

---

## Responsibilities

- Define required log events and metrics for backend engineers.
- Review tracing instrumentation in PRs.
- Define alert rules for staging and production.
- Generate weekly health report.
- Flag any log events that leak PII or key material (escalate to Security Lead immediately).

---

## Log Safety Rules

- No private keys in logs. Ever.
- No session key values in logs. Ever.
- User IDs: log as internal UUIDs, not email/phone.
- IP addresses: hash before logging.
- Calldata: log intent ID and chain only, not raw calldata content.
