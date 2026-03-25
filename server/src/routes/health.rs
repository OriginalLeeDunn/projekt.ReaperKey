use axum::{extract::State, Json};
use serde_json::{json, Value};

use crate::routes::AppState;

#[tracing::instrument(skip(state))]
pub async fn check(State(state): State<AppState>) -> Json<Value> {
    let db_ok = sqlx::query("SELECT 1").execute(&state.db).await.is_ok();

    Json(json!({
        "status": if db_ok { "ok" } else { "degraded" },
        "db": if db_ok { "ok" } else { "error" },
        "chains": { "base": "configured" },
        "version": env!("CARGO_PKG_VERSION"),
    }))
}
