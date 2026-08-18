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

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct LoginRequest {
    pub method: AuthMethod,
    /// Email address (method = email) or the full SIWE message text (method = wallet).
    pub credential: String,
    /// Required when method = wallet: hex-encoded (0x-prefixed) 65-byte ECDSA
    /// signature over `credential`. Ignored for method = email.
    #[serde(default)]
    pub signature: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone, PartialEq, utoipa::ToSchema)]
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

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct RefreshRequest {
    pub token: String,
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct AuthResponse {
    pub user_id: Uuid,
    pub token: String,
    pub expires_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct SiweNonceResponse {
    /// Single-use, expires in 5 minutes. Embed as the `Nonce:` field of the
    /// SIWE message the wallet signs.
    pub nonce: String,
}
