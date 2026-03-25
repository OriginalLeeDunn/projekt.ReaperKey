use chrono::{DateTime, TimeZone, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(sqlx::FromRow)]
pub struct DbUser {
    pub id: String,
    pub auth_method: String,
    pub auth_credential_hash: String,
    pub created_at: i64,
}

impl DbUser {
    pub fn user_id(&self) -> Result<Uuid, uuid::Error> {
        Uuid::parse_str(&self.id)
    }

    pub fn created_at_utc(&self) -> DateTime<Utc> {
        Utc.timestamp_opt(self.created_at, 0)
            .single()
            .unwrap_or_else(Utc::now)
    }
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub method: AuthMethod,
    pub credential: String,
}

#[derive(Debug, Deserialize, Serialize, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AuthMethod {
    Email,
    Wallet,
}

impl AuthMethod {
    pub fn as_str(&self) -> &'static str {
        match self {
            AuthMethod::Email => "email",
            AuthMethod::Wallet => "wallet",
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct RefreshRequest {
    pub token: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub user_id: Uuid,
    pub token: String,
    pub expires_at: DateTime<Utc>,
}
