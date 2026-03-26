use axum::{extract::State, http::StatusCode, Json};
use chrono::Utc;
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    error::{AppError, AppResult},
    routes::AppState,
};

#[derive(Debug, Deserialize)]
pub struct RecoveryInitRequest {
    pub account_address: String,
}

/// POST /recovery/initiate — SPEC-040
/// Initiates recovery for an account. Does NOT grant server key access.
#[tracing::instrument(skip(state, body))]
pub async fn init(
    State(state): State<AppState>,
    Json(body): Json<RecoveryInitRequest>,
) -> AppResult<(StatusCode, Json<serde_json::Value>)> {
    // Look up account by address
    let account_row: Option<(String,)> =
        sqlx::query_as("SELECT id FROM accounts WHERE address = ?")
            .bind(&body.account_address)
            .fetch_optional(&state.db)
            .await?;

    let (account_id,) = account_row.ok_or(AppError::NotFound)?;

    let recovery_id = Uuid::new_v4();
    let now = Utc::now().timestamp();

    sqlx::query(
        "INSERT INTO recovery (id, account_id, method, status, created_at) VALUES (?, ?, 'social', 'initiated', ?)",
    )
    .bind(recovery_id.to_string())
    .bind(&account_id)
    .bind(now)
    .execute(&state.db)
    .await?;

    tracing::info!(recovery_id = %recovery_id, account_id = %account_id, "recovery.init");

    // SPEC-040: recovery must NOT grant server key access (non-custodial constraint)
    Ok((
        StatusCode::ACCEPTED,
        Json(serde_json::json!({
            "recovery_id": recovery_id,
            "method": "social",
            "status": "initiated",
            "instructions": "Complete recovery using your registered social recovery contacts.",
            "note": "GhostKey does not hold your private key. Recovery is user-controlled."
        })),
    ))
}
