use chrono::{DateTime, TimeZone, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(sqlx::FromRow)]
pub struct DbIntent {
    pub id: String,
    pub session_id: String,
    pub chain: String,
    pub target: String,
    pub calldata: String,
    pub value_wei: String,
    pub status: String,
    pub tx_hash: Option<String>,
    pub block_number: Option<i64>,
    pub reason: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

impl DbIntent {
    pub fn into_response(self) -> Result<IntentResponse, uuid::Error> {
        Ok(IntentResponse {
            intent_id: Uuid::parse_str(&self.id)?,
            status: self.status.parse().unwrap_or(IntentStatus::Pending),
            tx_hash: self.tx_hash,
            block_number: self.block_number,
            reason: self.reason,
        })
    }

    pub fn created_at_utc(&self) -> DateTime<Utc> {
        Utc.timestamp_opt(self.created_at, 0)
            .single()
            .unwrap_or_else(Utc::now)
    }
}

/// POST /intent/execute
/// The client builds and signs the UserOperation; server validates scope and routes it.
#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct ExecuteIntentRequest {
    pub session_id: Uuid,
    /// Target contract address — validated against session allowed_targets.
    pub target: String,
    /// Hex-encoded calldata for the target call.
    pub calldata: String,
    #[serde(default = "default_value")]
    pub value: String,
    /// Pre-built, pre-signed UserOperation from the SDK. Submitted to Pimlico bundler.
    pub user_operation: serde_json::Value,
}

fn default_value() -> String {
    "0".to_string()
}

#[derive(Debug, Serialize, Clone, PartialEq, utoipa::ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum IntentStatus {
    Pending,
    Submitted,
    Confirmed,
    Failed,
}

impl std::str::FromStr for IntentStatus {
    type Err = ();
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "pending" => Ok(IntentStatus::Pending),
            "submitted" => Ok(IntentStatus::Submitted),
            "confirmed" => Ok(IntentStatus::Confirmed),
            "failed" => Ok(IntentStatus::Failed),
            _ => Err(()),
        }
    }
}

impl IntentStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            IntentStatus::Pending => "pending",
            IntentStatus::Submitted => "submitted",
            IntentStatus::Confirmed => "confirmed",
            IntentStatus::Failed => "failed",
        }
    }
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct IntentResponse {
    pub intent_id: Uuid,
    pub status: IntentStatus,
    pub tx_hash: Option<String>,
    pub block_number: Option<i64>,
    pub reason: Option<String>,
}
