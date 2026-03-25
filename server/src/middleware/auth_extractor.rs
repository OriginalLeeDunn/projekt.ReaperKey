use axum::{async_trait, extract::FromRequestParts, http::request::Parts};
use uuid::Uuid;

use crate::{auth_jwt, error::AppError, routes::AppState};

/// Extracts the authenticated user from the Bearer token.
/// Use as a handler parameter: `auth: AuthUser`
#[derive(Debug)]
pub struct AuthUser {
    pub user_id: Uuid,
}

#[async_trait]
impl FromRequestParts<AppState> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let auth_header = parts
            .headers
            .get(axum::http::header::AUTHORIZATION)
            .and_then(|v| v.to_str().ok())
            .ok_or(AppError::Unauthorized("missing authorization header"))?;

        let token = auth_header
            .strip_prefix("Bearer ")
            .ok_or(AppError::Unauthorized("invalid authorization format"))?;

        let claims = auth_jwt::validate(token, &state.config.auth.jwt_secret)?;

        let user_id = Uuid::parse_str(&claims.sub)
            .map_err(|_| AppError::Unauthorized("invalid token subject"))?;

        Ok(AuthUser { user_id })
    }
}
