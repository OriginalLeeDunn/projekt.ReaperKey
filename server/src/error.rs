use axum::{
    http::{header, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

#[derive(thiserror::Error, Debug)]
pub enum AppError {
    #[error("not found")]
    NotFound,

    #[error("unauthorized: {0}")]
    Unauthorized(&'static str),

    #[error("forbidden")]
    Forbidden,

    #[error("bad request: {0}")]
    BadRequest(String),

    #[error("rate limited")]
    RateLimited,

    #[error("session expired")]
    SessionExpired,

    #[error("intent out of scope")]
    IntentOutOfScope,

    #[error("value exceeds session limit")]
    ValueExceedsLimit,

    #[error("payload too large")]
    PayloadTooLarge,

    #[error("invalid calldata")]
    InvalidCalldata,

    #[error("database error")]
    Database(#[from] sqlx::Error),

    #[error("internal error")]
    Internal,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        tracing::error!(error = %self, "request error");

        match self {
            AppError::RateLimited => {
                let mut res = (
                    StatusCode::TOO_MANY_REQUESTS,
                    Json(json!({ "error": "rate_limited" })),
                )
                    .into_response();
                res.headers_mut()
                    .insert(header::RETRY_AFTER, HeaderValue::from_static("60"));
                res
            }
            other => {
                let (status, code) = match &other {
                    AppError::NotFound => (StatusCode::NOT_FOUND, "not_found"),
                    AppError::Unauthorized(code) => (StatusCode::UNAUTHORIZED, *code),
                    AppError::Forbidden => (StatusCode::FORBIDDEN, "forbidden"),
                    AppError::BadRequest(_) => (StatusCode::BAD_REQUEST, "bad_request"),
                    AppError::RateLimited => unreachable!(),
                    AppError::SessionExpired => (StatusCode::UNAUTHORIZED, "session_expired"),
                    AppError::IntentOutOfScope => (StatusCode::FORBIDDEN, "intent_out_of_scope"),
                    AppError::ValueExceedsLimit => {
                        (StatusCode::FORBIDDEN, "value_exceeds_session_limit")
                    }
                    AppError::PayloadTooLarge => {
                        (StatusCode::PAYLOAD_TOO_LARGE, "payload_too_large")
                    }
                    AppError::InvalidCalldata => (StatusCode::BAD_REQUEST, "invalid_calldata"),
                    AppError::Database(_) => (StatusCode::INTERNAL_SERVER_ERROR, "database_error"),
                    AppError::Internal => (StatusCode::INTERNAL_SERVER_ERROR, "internal_error"),
                };
                (status, Json(json!({ "error": code }))).into_response()
            }
        }
    }
}

pub type AppResult<T> = Result<T, AppError>;
