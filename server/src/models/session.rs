use chrono::{DateTime, TimeZone, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(sqlx::FromRow)]
pub struct DbSession {
    pub id: String,
    pub account_id: String,
    pub key_hash: String,
    pub allowed_targets: String,   // JSON array
    pub allowed_selectors: String, // JSON array
    pub max_value_wei: String,
    pub expires_at: i64,
    pub created_at: i64,
}

impl DbSession {
    pub fn is_expired(&self) -> bool {
        Utc::now().timestamp() > self.expires_at
    }

    pub fn allows_target(&self, target: &str) -> bool {
        let targets: Vec<String> = serde_json::from_str(&self.allowed_targets).unwrap_or_default();
        targets.iter().any(|t| t.eq_ignore_ascii_case(target))
    }

    pub fn max_value(&self) -> u128 {
        self.max_value_wei.parse().unwrap_or(0)
    }
}

/// POST /session-key/issue
/// The client generates the session key; only its hash is sent to the server.
#[derive(Debug, Deserialize)]
pub struct IssueSessionKeyRequest {
    pub account_id: Uuid,
    /// SHA-256 hash of the session key, computed client-side. Server never sees the key.
    pub key_hash: String,
    pub allowed_targets: Vec<String>,
    pub allowed_selectors: Vec<String>,
    pub max_value_wei: String,
    pub ttl_seconds: u64,
}

#[derive(Debug, Serialize)]
pub struct SessionKeyResponse {
    pub session_id: Uuid,
    pub key_hash: String,
    pub expires_at: DateTime<Utc>,
}

impl DbSession {
    pub fn expires_at_utc(&self) -> DateTime<Utc> {
        Utc.timestamp_opt(self.expires_at, 0)
            .single()
            .unwrap_or_else(Utc::now)
    }
}
