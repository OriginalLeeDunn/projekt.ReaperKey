use std::sync::Arc;

use axum::{routing::{get, post}, Router};
use tower_http::{cors::CorsLayer, limit::RequestBodyLimitLayer, trace::TraceLayer};

use crate::{
    chain::ChainAdapter,
    config::Config,
    db::Db,
    middleware::RateLimiter,
};

pub mod account;
pub mod auth;
pub mod health;
pub mod intent;
pub mod recovery;
pub mod session_key;

#[derive(Clone)]
pub struct AppState {
    pub db: Db,
    pub config: Config,
    pub rate_limiter: Arc<RateLimiter>,
    pub chain: Arc<ChainAdapter>,
}

pub fn build(db: Db, config: Config) -> Router {
    let rate_limiter = Arc::new(RateLimiter::new(10, 60)); // 10 req / 60s per key
    let chain = Arc::new(ChainAdapter::new(&config.chains.base));

    let state = AppState { db, config, rate_limiter, chain };

    Router::new()
        .route("/health",              get(health::check))
        .route("/auth/login",          post(auth::login))
        .route("/auth/refresh",        post(auth::refresh))
        .route("/account/create",      post(account::create))
        .route("/account/:id",         get(account::fetch))
        .route("/session-key/issue",   post(session_key::issue))
        .route("/intent/execute",      post(intent::execute))
        .route("/intent/:id/status",   get(intent::status))
        .route("/recovery/init",       post(recovery::init))
        .layer(TraceLayer::new_for_http())
        .layer(RequestBodyLimitLayer::new(1024 * 1024)) // 1MB — SPEC-202
        .layer(CorsLayer::permissive())
        .with_state(state)
}
