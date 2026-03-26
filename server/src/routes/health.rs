use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde_json::{json, Value};

use crate::routes::AppState;

/// GET /health — returns 200 OK when healthy, 503 Service Unavailable when degraded.
/// #65: DB check + version in response.
#[tracing::instrument(skip(state))]
pub async fn check(State(state): State<AppState>) -> impl IntoResponse {
    let db_ok = sqlx::query("SELECT 1").execute(&state.db).await.is_ok();

    let body: Value = json!({
        "status": if db_ok { "ok" } else { "degraded" },
        "db": if db_ok { "ok" } else { "error" },
        "chains": { "base": "configured" },
        "version": env!("CARGO_PKG_VERSION"),
    });

    let status = if db_ok {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    };

    (status, Json(body))
}
