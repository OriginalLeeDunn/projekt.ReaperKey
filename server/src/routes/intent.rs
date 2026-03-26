use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use chrono::Utc;
use uuid::Uuid;

use crate::{
    error::{AppError, AppResult},
    middleware::AuthUser,
    models::intent::{DbIntent, ExecuteIntentRequest, IntentResponse, IntentStatus},
    routes::AppState,
};

/// POST /intent/execute — SPEC-030, SPEC-034, SPEC-035
#[tracing::instrument(skip(state, body), fields(user_id = %auth.user_id, session_id = %body.session_id))]
pub async fn execute(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(body): Json<ExecuteIntentRequest>,
) -> AppResult<(StatusCode, Json<IntentResponse>)> {
    // Rate limit per user (SPEC-035)
    if !state
        .rate_limiter
        .check(&format!("intent:{}", auth.user_id))
    {
        return Err(AppError::RateLimited);
    }

    // Load and validate session
    let session: Option<crate::models::session::DbSession> = sqlx::query_as(
        "SELECT id, account_id, key_hash, allowed_targets, allowed_selectors, max_value_wei, expires_at, created_at
         FROM sessions WHERE id = ?",
    )
    .bind(body.session_id.to_string())
    .fetch_optional(&state.db)
    .await?;

    let session = session.ok_or(AppError::NotFound)?;

    // SPEC-022: reject expired sessions
    if session.is_expired() {
        return Err(AppError::SessionExpired);
    }

    // SPEC-021: reject targets outside allowed scope
    if !session.allows_target(&body.target) {
        return Err(AppError::IntentOutOfScope);
    }

    // SPEC-023: reject value above session limit
    let requested_value: u128 = body
        .value
        .parse()
        .map_err(|_| AppError::BadRequest("invalid value".into()))?;
    if requested_value > session.max_value() {
        return Err(AppError::ValueExceedsLimit);
    }

    // SPEC-034: validate calldata is valid hex
    validate_calldata(&body.calldata)?;

    // Verify session's account belongs to requesting user
    let account_row: Option<(String,)> =
        sqlx::query_as("SELECT user_id FROM accounts WHERE id = ?")
            .bind(&session.account_id)
            .fetch_optional(&state.db)
            .await?;

    let (account_user_id,) = account_row.ok_or(AppError::NotFound)?;
    if Uuid::parse_str(&account_user_id).map_err(|_| AppError::Internal)? != auth.user_id {
        return Err(AppError::Forbidden);
    }

    // Persist intent as pending
    let intent_id = Uuid::new_v4();
    let now = Utc::now().timestamp();
    let chain = "base"; // v0: Base only

    sqlx::query(
        "INSERT INTO intents (id, session_id, chain, target, calldata, value_wei, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)",
    )
    .bind(intent_id.to_string())
    .bind(body.session_id.to_string())
    .bind(chain)
    .bind(&body.target)
    .bind(&body.calldata)
    .bind(&body.value)
    .bind(now)
    .bind(now)
    .execute(&state.db)
    .await?;

    tracing::info!(intent_id = %intent_id, target = %body.target, chain = chain, "intent.submitted");

    // Spawn background task to submit UserOp to Pimlico bundler
    let db = state.db.clone();
    let chain_adapter = state.chain.clone();
    let user_op = body.user_operation.clone();
    let id_str = intent_id.to_string();
    tokio::spawn(async move {
        submit_to_bundler(db, chain_adapter, id_str, user_op).await;
    });

    Ok((
        StatusCode::ACCEPTED,
        Json(IntentResponse {
            intent_id,
            status: IntentStatus::Pending,
            tx_hash: None,
            block_number: None,
            reason: None,
        }),
    ))
}

/// GET /intent/:id/status — SPEC-031, SPEC-032, SPEC-033
#[tracing::instrument(skip(state), fields(user_id = %auth.user_id))]
pub async fn status(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<Json<IntentResponse>> {
    let intent: Option<DbIntent> = sqlx::query_as(
        "SELECT id, session_id, chain, target, calldata, value_wei, status, tx_hash, block_number, reason, created_at, updated_at
         FROM intents WHERE id = ?",
    )
    .bind(id.to_string())
    .fetch_optional(&state.db)
    .await?;

    let intent = intent.ok_or(AppError::NotFound)?;

    // Verify ownership via session → account → user
    let owner_row: Option<(String,)> = sqlx::query_as(
        "SELECT a.user_id FROM accounts a
         JOIN sessions s ON s.account_id = a.id
         WHERE s.id = ?",
    )
    .bind(&intent.session_id)
    .fetch_optional(&state.db)
    .await?;

    let (owner_id,) = owner_row.ok_or(AppError::NotFound)?;
    if Uuid::parse_str(&owner_id).map_err(|_| AppError::Internal)? != auth.user_id {
        return Err(AppError::Forbidden);
    }

    Ok(Json(
        intent.into_response().map_err(|_| AppError::Internal)?,
    ))
}

/// Background task: submit signed UserOp to Pimlico, poll for receipt, update DB.
async fn submit_to_bundler(
    db: crate::db::Db,
    chain: std::sync::Arc<crate::chain::ChainAdapter>,
    intent_id: String,
    user_op: serde_json::Value,
) {
    // Attempt paymaster sponsorship
    let sponsored = match chain.sponsor_user_operation(&user_op).await {
        Ok(op) => op,
        Err(e) => {
            tracing::warn!(intent_id = %intent_id, error = %e, "paymaster sponsorship failed");
            update_intent_status(
                &db,
                &intent_id,
                "failed",
                None,
                None,
                Some("execution_reverted"),
            )
            .await;
            return;
        }
    };

    // Submit to bundler
    let user_op_hash = match chain.send_user_operation(&sponsored).await {
        Ok(h) => h,
        Err(e) => {
            tracing::warn!(intent_id = %intent_id, error = %e, "bundler submission failed");
            update_intent_status(
                &db,
                &intent_id,
                "failed",
                None,
                None,
                Some("execution_reverted"),
            )
            .await;
            return;
        }
    };

    update_intent_status(
        &db,
        &intent_id,
        "submitted",
        Some(&user_op_hash),
        None,
        None,
    )
    .await;
    tracing::info!(intent_id = %intent_id, user_op_hash = %user_op_hash, "intent.bundler_submitted");

    // Poll for receipt (30 attempts × 2s = 60s max)
    for _ in 0..30 {
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
        match chain.get_operation_receipt(&user_op_hash).await {
            Ok(Some(receipt)) => {
                let block = receipt["receipt"]["blockNumber"]
                    .as_str()
                    .and_then(|s| i64::from_str_radix(s.trim_start_matches("0x"), 16).ok());
                update_intent_status(
                    &db,
                    &intent_id,
                    "confirmed",
                    Some(&user_op_hash),
                    block,
                    None,
                )
                .await;
                tracing::info!(intent_id = %intent_id, "intent.confirmed");
                return;
            }
            Ok(None) => continue,
            Err(e) => {
                tracing::warn!(intent_id = %intent_id, error = %e, "receipt poll error");
                break;
            }
        }
    }

    // Timed out
    tracing::warn!(intent_id = %intent_id, "intent.poll_timeout");
    update_intent_status(
        &db,
        &intent_id,
        "failed",
        Some(&user_op_hash),
        None,
        Some("execution_reverted"),
    )
    .await;
}

async fn update_intent_status(
    db: &crate::db::Db,
    id: &str,
    status: &str,
    tx_hash: Option<&str>,
    block: Option<i64>,
    reason: Option<&str>,
) {
    let now = Utc::now().timestamp();
    let _ = sqlx::query(
        "UPDATE intents SET status = ?, tx_hash = ?, block_number = ?, reason = ?, updated_at = ? WHERE id = ?",
    )
    .bind(status)
    .bind(tx_hash)
    .bind(block)
    .bind(reason)
    .bind(now)
    .bind(id)
    .execute(db)
    .await;
}

fn validate_calldata(calldata: &str) -> AppResult<()> {
    let data = calldata.strip_prefix("0x").unwrap_or(calldata);
    if data.is_empty()
        || (data.len().is_multiple_of(2) && data.chars().all(|c| c.is_ascii_hexdigit()))
    {
        Ok(())
    } else {
        Err(AppError::InvalidCalldata)
    }
}
