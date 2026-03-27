use std::{collections::HashMap, sync::Arc};

use crate::{chain::ChainAdapter, config::Config, db::Db, middleware::RateLimiter};
use axum::{
    http::{header, HeaderName, HeaderValue, Method},
    routing::{get, post},
    Router,
};
use tower_http::{
    cors::CorsLayer,
    limit::RequestBodyLimitLayer,
    request_id::{MakeRequestUuid, PropagateRequestIdLayer, SetRequestIdLayer},
    set_header::SetResponseHeaderLayer,
    trace::TraceLayer,
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
    /// Multi-chain map: chain name (e.g. "base", "arbitrum") → adapter.
    /// The "base" entry is always present; others are optional.
    pub chains: Arc<HashMap<String, Arc<ChainAdapter>>>,
}

impl AppState {
    /// Returns the chain adapter for a given chain name.
    /// Falls back to "base" if the requested chain is not configured.
    pub fn chain_for(&self, name: &str) -> Arc<ChainAdapter> {
        self.chains
            .get(name)
            .or_else(|| self.chains.get("base"))
            .cloned()
            .expect("base chain always configured")
    }
}

pub fn build(db: Db, config: Config) -> Router {
    let rate_limiter = Arc::new(RateLimiter::new(10, 60)); // 10 req / 60s per key

    // Build multi-chain adapter map
    let mut chain_map: HashMap<String, Arc<ChainAdapter>> = HashMap::new();
    for (name, cfg) in config.chains.all() {
        chain_map.insert(name.to_string(), Arc::new(ChainAdapter::new(cfg)));
    }
    let chains = Arc::new(chain_map);

    // Build CORS from configured origins — #61
    let cors = build_cors(&config.server.cors_origins);

    let state = AppState {
        db,
        config,
        rate_limiter,
        chains,
    };

    let request_id_header = HeaderName::from_static("x-request-id");

    Router::new()
        .route("/health", get(health::check))
        .route("/auth/login", post(auth::login))
        .route("/auth/refresh", post(auth::refresh))
        .route("/account/create", post(account::create))
        .route("/account/:id", get(account::fetch))
        .route("/session-key/issue", post(session_key::issue))
        .route("/intent/execute", post(intent::execute))
        .route("/intent/:id/status", get(intent::status))
        .route("/recovery/initiate", post(recovery::init))
        .layer(TraceLayer::new_for_http())
        .layer(RequestBodyLimitLayer::new(1024 * 1024)) // 1MB — SPEC-202
        .layer(cors)
        // Security headers — #64
        .layer(SetResponseHeaderLayer::overriding(
            header::HeaderName::from_static("x-content-type-options"),
            HeaderValue::from_static("nosniff"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            header::HeaderName::from_static("x-frame-options"),
            HeaderValue::from_static("DENY"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            header::HeaderName::from_static("referrer-policy"),
            HeaderValue::from_static("strict-origin-when-cross-origin"),
        ))
        // Request ID — #62
        .layer(PropagateRequestIdLayer::new(request_id_header.clone()))
        .layer(SetRequestIdLayer::new(request_id_header, MakeRequestUuid))
        .with_state(state)
}

fn build_cors(origins: &[String]) -> CorsLayer {
    let allowed: Vec<HeaderValue> = origins.iter().filter_map(|o| o.parse().ok()).collect();

    if allowed.is_empty() {
        // Deny all cross-origin requests if misconfigured
        CorsLayer::new()
    } else {
        CorsLayer::new()
            .allow_origin(allowed)
            .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
            .allow_headers([header::AUTHORIZATION, header::CONTENT_TYPE])
    }
}
