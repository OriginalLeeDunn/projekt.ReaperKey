use chrono::{DateTime, Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::AppError;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String, // user_id
    pub exp: i64,
    pub iat: i64,
}

pub fn issue(
    user_id: Uuid,
    secret: &str,
    ttl_seconds: u64,
) -> Result<(String, DateTime<Utc>), AppError> {
    let now = Utc::now();
    let expires_at = now + Duration::seconds(ttl_seconds as i64);
    let claims = Claims {
        sub: user_id.to_string(),
        exp: expires_at.timestamp(),
        iat: now.timestamp(),
    };
    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|_| AppError::Internal)?;
    Ok((token, expires_at))
}

pub fn validate(token: &str, secret: &str) -> Result<Claims, AppError> {
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )
    .map(|d| d.claims)
    .map_err(|e| match e.kind() {
        jsonwebtoken::errors::ErrorKind::ExpiredSignature => AppError::Unauthorized("token_expired"),
        _ => AppError::Unauthorized("invalid_token"),
    })
}
