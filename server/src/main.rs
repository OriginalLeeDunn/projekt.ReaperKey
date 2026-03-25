use anyhow::Result;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use ghostkey::{config::Config, db, routes};

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| "ghostkey=debug,tower_http=debug".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = Config::load()?;
    tracing::info!(host = %config.server.host, port = %config.server.port, "starting ghostkey-server");

    let pool = db::connect(&config.database.url).await?;
    db::migrate(&pool).await?;

    let app = routes::build(pool, config.clone());

    let listener = tokio::net::TcpListener::bind(
        format!("{}:{}", config.server.host, config.server.port)
    ).await?;

    tracing::info!("listening on {}", listener.local_addr()?);
    axum::serve(listener, app).await?;

    Ok(())
}
