use anyhow::Result;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use ghostkey::{config::Config, db, routes};

#[tokio::main]
async fn main() -> Result<()> {
    // Load config first so log_format is available before initialising tracing.
    let config = Config::load()?;

    let env_filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| "ghostkey=debug,tower_http=debug".into());

    // #62: JSON format for production; pretty format for local dev.
    if config.server.log_format == "json" {
        tracing_subscriber::registry()
            .with(env_filter)
            .with(tracing_subscriber::fmt::layer().json())
            .init();
    } else {
        tracing_subscriber::registry()
            .with(env_filter)
            .with(tracing_subscriber::fmt::layer())
            .init();
    }
    tracing::info!(host = %config.server.host, port = %config.server.port, "starting ghostkey-server");

    let pool = db::connect(&config.database.url).await?;
    db::migrate(&pool).await?;

    let app = routes::build(pool, config.clone());

    let listener =
        tokio::net::TcpListener::bind(format!("{}:{}", config.server.host, config.server.port))
            .await?;

    tracing::info!("listening on {}", listener.local_addr()?);
    axum::serve(listener, app).await?;

    Ok(())
}
