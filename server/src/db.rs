use sqlx::any::{install_default_drivers, AnyPoolOptions};
use sqlx::AnyPool;

pub type Db = AnyPool;

pub async fn connect(url: &str) -> anyhow::Result<Db> {
    // Must be called once before any AnyPool connection is established.
    install_default_drivers();

    // SQLite in-memory databases are per-connection; a pool with >1 connection
    // would give each checkout its own empty database.  Cap to 1 for :memory: URLs.
    let max_conns: u32 = if url.contains(":memory:") { 1 } else { 5 };

    let pool = AnyPoolOptions::new()
        .max_connections(max_conns)
        .connect(url)
        .await?;
    Ok(pool)
}

pub async fn migrate(pool: &Db, url: &str) -> anyhow::Result<()> {
    if url.starts_with("postgres") {
        // PostgreSQL: use migrations_pg directory.
        // MIGRATIONS_PG_PATH env var overrides the compile-time default (useful in Docker).
        let path = std::env::var("MIGRATIONS_PG_PATH")
            .unwrap_or_else(|_| concat!(env!("CARGO_MANIFEST_DIR"), "/migrations_pg").to_string());
        sqlx::migrate::Migrator::new(std::path::Path::new(&path))
            .await?
            .run(pool)
            .await?;
    } else {
        // SQLite: use compile-time embedded migrations.
        sqlx::migrate!("./migrations").run(pool).await?;
    }
    Ok(())
}
