use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    Json,
};
use sha2::{Digest, Sha256};
use siwe::{Message, VerificationOpts};
use std::str::FromStr;
use uuid::Uuid;

use crate::{
    activity::ActivityEntry,
    auth_jwt,
    error::{AppError, AppResult},
    middleware::AuthUser,
    models::user::{
        AuthMethod, AuthResponse, DbUser, LoginRequest, RefreshRequest, SiweNonceResponse,
    },
    routes::AppState,
};

/// POST /auth/login — SPEC-001, SPEC-002, SPEC-006, SPEC-007
#[utoipa::path(
    post,
    path = "/auth/login",
    tag = "auth",
    request_body = crate::models::user::LoginRequest,
    responses(
        (status = 201, description = "New user registered", body = crate::models::user::AuthResponse),
        (status = 200, description = "Existing user authenticated", body = crate::models::user::AuthResponse),
        (status = 429, description = "Rate limited"),
    )
)]
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
        state.activity.emit(
            ActivityEntry::backend("auth.ratelimit.hit", "rate limit exceeded on login", "warn")
                .with_meta(serde_json::json!({ "endpoint": "POST /auth/login" })),
        );
        return Err(AppError::RateLimited);
    }

    let credential_hash = match body.method {
        AuthMethod::Email => hash_credential(&body.credential),
        AuthMethod::Wallet => {
            let address = verify_wallet_login(&state, &body).await?;
            hash_credential(&address)
        }
    };

    let existing: Option<DbUser> = sqlx::query_as(
        "SELECT id, auth_method, auth_credential_hash, created_at FROM users WHERE auth_credential_hash = ?",
    )
    .bind(&credential_hash)
    .fetch_optional(&state.db)
    .await?;

    let (user_id, is_new) = match existing {
        Some(u) => (
            u.user_id()
                .map_err(|_| AppError::Internal("user_id parse failed".into()))?,
            false,
        ),
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
    let detail = if is_new {
        "new user registered"
    } else {
        "user authenticated"
    };
    state.activity.emit(
        ActivityEntry::backend("auth.login.success", detail, "ok")
            .with_user(user_id)
            .with_meta(serde_json::json!({ "is_new": is_new })),
    );
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
#[utoipa::path(
    post,
    path = "/auth/refresh",
    tag = "auth",
    request_body = crate::models::user::RefreshRequest,
    responses(
        (status = 200, description = "Token refreshed", body = crate::models::user::AuthResponse),
        (status = 401, description = "Invalid or expired token"),
    )
)]
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
    state.activity.emit(
        ActivityEntry::backend("auth.refresh.success", "token refreshed", "ok").with_user(user_id),
    );
    Ok(Json(AuthResponse {
        user_id,
        token,
        expires_at,
    }))
}

/// POST /auth/logout — revoke the current token immediately.
/// Adds the token's SHA-256 hash to the denylist; subsequent requests
/// using this token will receive 401 even before natural expiry.
#[tracing::instrument(skip(state, headers), fields(user_id = %auth.user_id))]
pub async fn logout(
    State(state): State<AppState>,
    auth: AuthUser,
    headers: HeaderMap,
) -> AppResult<StatusCode> {
    let token = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or(AppError::Unauthorized("missing token"))?;

    let hash = auth_jwt::token_hash(token);

    // Fetch expiry from the claims so the denylist entry can be pruned later
    let claims = auth_jwt::validate(token, &state.config.auth.jwt_secret)?;

    sqlx::query("INSERT OR IGNORE INTO token_denylist (token_hash, expires_at) VALUES (?, ?)")
        .bind(&hash)
        .bind(claims.exp)
        .execute(&state.db)
        .await?;

    tracing::info!(user_id = %auth.user_id, "auth.logout");
    state
        .activity
        .emit(ActivityEntry::backend("auth.logout", "token revoked", "ok").with_user(auth.user_id));
    Ok(StatusCode::NO_CONTENT)
}

fn hash_credential(credential: &str) -> String {
    let mut h = Sha256::new();
    h.update(credential.as_bytes());
    format!("{:x}", h.finalize())
}

/// GET /auth/wallet/nonce — issue a single-use SIWE nonce.
/// Embed the returned value as the `Nonce:` field of the EIP-4361 message
/// the wallet signs; it expires in 5 minutes and is consumed on first use.
#[utoipa::path(
    get,
    path = "/auth/wallet/nonce",
    tag = "auth",
    responses(
        (status = 200, description = "Nonce issued", body = crate::models::user::SiweNonceResponse),
        (status = 429, description = "Rate limited"),
    )
)]
#[tracing::instrument(skip(state, headers))]
pub async fn wallet_nonce(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> AppResult<Json<SiweNonceResponse>> {
    let ip = headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("unknown");
    if !state.rate_limiter.check(&format!("siwe-nonce:{ip}")) {
        return Err(AppError::RateLimited);
    }

    let nonce = siwe::generate_nonce();
    let expires_at = chrono::Utc::now().timestamp() + 300;

    sqlx::query("INSERT INTO siwe_nonces (nonce, expires_at) VALUES (?, ?)")
        .bind(&nonce)
        .bind(expires_at)
        .execute(&state.db)
        .await?;

    Ok(Json(SiweNonceResponse { nonce }))
}

/// Verifies a SIWE (EIP-4361) login: parses `body.credential` as a SIWE
/// message, checks its nonce was actually issued by this server and hasn't
/// been used already, checks the domain matches this deployment (phishing/
/// cross-site relay protection), checks the message is currently valid
/// (issued_at/expiration/not_before), and recovers the signer from
/// `body.signature` to confirm it matches the address the message claims.
///
/// Returns the lowercased signer address on success — never the raw
/// signature or any key material.
async fn verify_wallet_login(state: &AppState, body: &LoginRequest) -> AppResult<String> {
    let signature_hex = body
        .signature
        .as_deref()
        .ok_or(AppError::BadRequest("missing signature".into()))?;

    let message = Message::from_str(&body.credential)
        .map_err(|_| AppError::BadRequest("invalid SIWE message".into()))?;

    let enabled_chains: Vec<u64> = state
        .config
        .chains
        .all()
        .iter()
        .map(|(_, c)| c.chain_id)
        .collect();
    if !enabled_chains.contains(&message.chain_id) {
        return Err(AppError::BadRequest("unsupported chain".into()));
    }

    let sig_bytes = hex::decode(signature_hex.trim_start_matches("0x"))
        .map_err(|_| AppError::BadRequest("invalid signature encoding".into()))?;
    if sig_bytes.len() != 65 {
        return Err(AppError::BadRequest("invalid signature length".into()));
    }

    // Consume the nonce atomically: a DELETE that also checks expiry means
    // an already-used, never-issued, or expired nonce all fail the same way
    // (rows_affected == 0), with no separate read-then-write race window.
    let now = chrono::Utc::now().timestamp();
    let deleted = sqlx::query("DELETE FROM siwe_nonces WHERE nonce = ? AND expires_at > ?")
        .bind(&message.nonce)
        .bind(now)
        .execute(&state.db)
        .await?;
    if deleted.rows_affected() != 1 {
        return Err(AppError::Unauthorized("invalid or expired nonce"));
    }

    let domain = state
        .config
        .server
        .siwe_domain
        .parse()
        .map_err(|_| AppError::Internal("misconfigured siwe_domain".into()))?;

    let opts = VerificationOpts {
        domain: Some(domain),
        nonce: None,     // already verified via the DB-backed single-use check above
        timestamp: None, // validate against wall-clock now via issued_at/expiration
    };

    message
        .verify(&sig_bytes, &opts)
        .await
        .map_err(|_| AppError::Unauthorized("invalid signature"))?;

    Ok(format!("0x{}", hex::encode(message.address)).to_lowercase())
}
