use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    Json,
};
use sha2::{Digest, Sha256};
use uuid::Uuid;

use crate::{
    auth_jwt,
    error::{AppError, AppResult},
    models::user::{AuthResponse, DbUser, LoginRequest, RefreshRequest},
    routes::AppState,
};

/// POST /auth/login — SPEC-001, SPEC-002, SPEC-006, SPEC-007
#[tracing::instrument(skip(state, headers, body), fields(method = ?body.method))]
pub async fn login(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<LoginRequest>,
) -> AppResult<(StatusCode, Json<AuthResponse>)> {
    let ip = headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("unknown");
    if !state.rate_limiter.check(&format!("login:{ip}")) {
        return Err(AppError::RateLimited);
    }

    let credential_hash = hash_credential(&body.credential);

    let existing: Option<DbUser> = sqlx::query_as(
        "SELECT id, auth_method, auth_credential_hash, created_at FROM users WHERE auth_credential_hash = ?",
    )
    .bind(&credential_hash)
    .fetch_optional(&state.db)
    .await?;

    let (user_id, is_new) = match existing {
        Some(u) => (u.user_id().map_err(|_| AppError::Internal)?, false),
        None => {
            let id = Uuid::new_v4();
            sqlx::query(
                "INSERT INTO users (id, auth_method, auth_credential_hash) VALUES (?, ?, ?)",
            )
            .bind(id.to_string())
            .bind(body.method.as_str())
            .bind(&credential_hash)
            .execute(&state.db)
            .await?;
            (id, true)
        }
    };

    let (token, expires_at) = auth_jwt::issue(
        user_id,
        &state.config.auth.jwt_secret,
        state.config.auth.session_ttl_seconds,
    )?;

    tracing::info!(user_id = %user_id, is_new, "auth.login.success");
    let status = if is_new {
        StatusCode::CREATED
    } else {
        StatusCode::OK
    };
    Ok((
        status,
        Json(AuthResponse {
            user_id,
            token,
            expires_at,
        }),
    ))
}

/// POST /auth/refresh — SPEC-003, SPEC-004, SPEC-005
#[tracing::instrument(skip(state, body))]
pub async fn refresh(
    State(state): State<AppState>,
    Json(body): Json<RefreshRequest>,
) -> AppResult<Json<AuthResponse>> {
    let claims = auth_jwt::validate(&body.token, &state.config.auth.jwt_secret)?;
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::Unauthorized("invalid token subject"))?;

    let (token, expires_at) = auth_jwt::issue(
        user_id,
        &state.config.auth.jwt_secret,
        state.config.auth.session_ttl_seconds,
    )?;

    tracing::info!(user_id = %user_id, "auth.refresh.success");
    Ok(Json(AuthResponse {
        user_id,
        token,
        expires_at,
    }))
}

fn hash_credential(credential: &str) -> String {
    let mut h = Sha256::new();
    h.update(credential.as_bytes());
    format!("{:x}", h.finalize())
}
