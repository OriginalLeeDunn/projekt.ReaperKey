use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use chrono::Utc;
use uuid::Uuid;

use crate::{
    activity::ActivityEntry,
    error::{AppError, AppResult},
    middleware::AuthUser,
    models::account::{AccountResponse, CreateAccountRequest, DbAccount},
    routes::AppState,
};

/// POST /account/create — SPEC-010, SPEC-013
#[utoipa::path(
    post,
    path = "/account/create",
    tag = "account",
    security(("bearer_token" = [])),
    request_body = crate::models::account::CreateAccountRequest,
    responses(
        (status = 201, description = "Account created", body = crate::models::account::AccountResponse),
        (status = 200, description = "Account already exists (idempotent)", body = crate::models::account::AccountResponse),
        (status = 401, description = "Unauthorized"),
    )
)]
#[tracing::instrument(skip(state, body), fields(user_id = %auth.user_id, chain = %body.chain))]
pub async fn create(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(body): Json<CreateAccountRequest>,
) -> AppResult<(StatusCode, Json<AccountResponse>)> {
    validate_evm_address(&body.address)?;

    // Idempotent — return existing if already created (SPEC-013)
    let existing: Option<DbAccount> = sqlx::query_as(
        "SELECT id, user_id, chain, address, aa_type, created_at FROM accounts WHERE user_id = ? AND chain = ?",
    )
    .bind(auth.user_id.to_string())
    .bind(&body.chain)
    .fetch_optional(&state.db)
    .await?;

    if let Some(account) = existing {
        return Ok((
            StatusCode::OK,
            Json(
                account
                    .into_response()
                    .map_err(|_| AppError::Internal("account uuid parse failed".into()))?,
            ),
        ));
    }

    let account_id = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO accounts (id, user_id, chain, address, aa_type, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(account_id.to_string())
    .bind(auth.user_id.to_string())
    .bind(&body.chain)
    .bind(&body.address)
    .bind("kernel")
    .bind(Utc::now().timestamp())
    .execute(&state.db)
    .await?;

    tracing::info!(account_id = %account_id, chain = %body.chain, "account.create");
    state.activity.emit(
        ActivityEntry::backend(
            "account.created",
            format!("smart account registered on {}", body.chain),
            "ok",
        )
        .with_user(auth.user_id)
        .with_chain(body.chain.clone())
        .with_meta(serde_json::json!({ "account_id": account_id, "aa_type": "kernel" })),
    );
    Ok((
        StatusCode::CREATED,
        Json(AccountResponse {
            account_id,
            address: body.address,
            chain: body.chain,
            aa_type: "kernel".to_string(),
            created_at: Utc::now(),
        }),
    ))
}

/// GET /account/:id — SPEC-011, SPEC-012
#[utoipa::path(
    get,
    path = "/account/{id}",
    tag = "account",
    security(("bearer_token" = [])),
    params(
        ("id" = uuid::Uuid, Path, description = "Account UUID"),
    ),
    responses(
        (status = 200, description = "Account details", body = crate::models::account::AccountResponse),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
        (status = 404, description = "Not found"),
    )
)]
#[tracing::instrument(skip(state), fields(user_id = %auth.user_id))]
pub async fn fetch(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<Json<AccountResponse>> {
    let account: Option<DbAccount> = sqlx::query_as(
        "SELECT id, user_id, chain, address, aa_type, created_at FROM accounts WHERE id = ?",
    )
    .bind(id.to_string())
    .fetch_optional(&state.db)
    .await?;

    let account = account.ok_or(AppError::NotFound)?;

    let owner_id = Uuid::parse_str(&account.user_id)
        .map_err(|_| AppError::Internal("account user_id parse failed".into()))?;
    if owner_id != auth.user_id {
        return Err(AppError::Forbidden); // SPEC-012
    }

    Ok(Json(account.into_response().map_err(|_| {
        AppError::Internal("account uuid parse failed".into())
    })?))
}

fn validate_evm_address(addr: &str) -> AppResult<()> {
    if addr.len() == 42
        && addr.starts_with("0x")
        && addr[2..].chars().all(|c| c.is_ascii_hexdigit())
    {
        Ok(())
    } else {
        Err(AppError::BadRequest(format!("invalid EVM address: {addr}")))
    }
}
