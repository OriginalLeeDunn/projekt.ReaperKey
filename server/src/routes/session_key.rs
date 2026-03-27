use axum::{extract::State, http::StatusCode, Json};
use chrono::{TimeZone, Utc};
use uuid::Uuid;

use crate::{
    error::{AppError, AppResult},
    middleware::AuthUser,
    models::session::{IssueSessionKeyRequest, SessionKeyResponse},
    routes::AppState,
};

/// POST /session-key/issue — SPEC-020, SPEC-021, SPEC-022, SPEC-023
#[tracing::instrument(skip(state, body), fields(user_id = %auth.user_id, account_id = %body.account_id))]
pub async fn issue(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(body): Json<IssueSessionKeyRequest>,
) -> AppResult<(StatusCode, Json<SessionKeyResponse>)> {
    // Verify account belongs to this user
    let account_row: Option<(String,)> =
        sqlx::query_as("SELECT user_id FROM accounts WHERE id = ?")
            .bind(body.account_id.to_string())
            .fetch_optional(&state.db)
            .await?;

    let (account_user_id,) = account_row.ok_or(AppError::NotFound)?;
    let account_owner = Uuid::parse_str(&account_user_id)
        .map_err(|_| AppError::Internal("account user_id parse failed".into()))?;
    if account_owner != auth.user_id {
        return Err(AppError::Forbidden);
    }

    let session_id = Uuid::new_v4();
    let now = Utc::now().timestamp();
    let expires_at = now + body.ttl_seconds as i64;

    let allowed_targets = serde_json::to_string(&body.allowed_targets)
        .map_err(|_| AppError::BadRequest("invalid allowed_targets".into()))?;
    let allowed_selectors = serde_json::to_string(&body.allowed_selectors)
        .map_err(|_| AppError::BadRequest("invalid allowed_selectors".into()))?;

    sqlx::query(
        "INSERT INTO sessions (id, account_id, key_hash, session_key_address, allowed_targets, allowed_selectors, max_value_wei, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(session_id.to_string())
    .bind(body.account_id.to_string())
    .bind(&body.key_hash)
    .bind(&body.session_key_address)
    .bind(&allowed_targets)
    .bind(&allowed_selectors)
    .bind(&body.max_value_wei)
    .bind(expires_at)
    .bind(now)
    .execute(&state.db)
    .await?;

    let expires_at_dt = chrono::Utc
        .timestamp_opt(expires_at, 0)
        .single()
        .unwrap_or_else(Utc::now);

    tracing::info!(session_id = %session_id, account_id = %body.account_id, expires_at = %expires_at_dt, "session_key.issued");

    // SPEC-020: return session_id + key_hash (echoed) + expires_at — NOT the raw session key
    Ok((
        StatusCode::CREATED,
        Json(SessionKeyResponse {
            session_id,
            key_hash: body.key_hash,
            session_key_address: body.session_key_address,
            expires_at: expires_at_dt,
        }),
    ))
}
