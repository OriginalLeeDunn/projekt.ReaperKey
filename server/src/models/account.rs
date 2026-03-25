use chrono::{DateTime, TimeZone, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Raw SQLite row — all primitives for reliable sqlx mapping.
#[derive(sqlx::FromRow)]
pub struct DbAccount {
    pub id: String,
    pub user_id: String,
    pub chain: String,
    pub address: String,
    pub aa_type: String,
    pub created_at: i64,
}

impl DbAccount {
    pub fn into_response(self) -> Result<AccountResponse, uuid::Error> {
        Ok(AccountResponse {
            account_id: Uuid::parse_str(&self.id)?,
            address: self.address,
            chain: self.chain,
            aa_type: self.aa_type,
            created_at: Utc.timestamp_opt(self.created_at, 0).single()
                .unwrap_or_else(Utc::now),
        })
    }
}

/// POST /account/create — client pre-computes counterfactual address via SDK.
#[derive(Debug, Deserialize)]
pub struct CreateAccountRequest {
    pub chain: String,
    /// Counterfactual ZeroDev Kernel v3 address, computed by SDK.
    pub address: String,
}

#[derive(Debug, Serialize)]
pub struct AccountResponse {
    pub account_id: Uuid,
    pub address: String,
    pub chain: String,
    pub aa_type: String,
    pub created_at: DateTime<Utc>,
}
