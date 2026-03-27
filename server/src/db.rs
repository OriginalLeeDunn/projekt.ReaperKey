use sqlx::any::{install_default_drivers, AnyPoolOptions};
use sqlx::AnyPool;

pub type Db = AnyPool;

pub async fn connect(url: &str) -> anyhow::Result<Db> {
    // Must be called once before any AnyPool connection is established.
    install_default_drivers();

    // For file-based SQLite URLs:
    //   1. Ensure parent directory exists (sqlx doesn't create it).
    //   2. Append ?mode=rwc so SQLite creates the file if absent.
    //      (AnyPool doesn't set create_if_missing=true like SqlitePool did.)
    ensure_sqlite_dir(url)?;
    let effective_url = sqlite_create_if_missing(url);

    // SQLite in-memory databases are per-connection; a pool with >1 connection
    // would give each checkout its own empty database.  Cap to 1 for :memory: URLs.
    let max_conns: u32 = if url.contains(":memory:") { 1 } else { 5 };

    let pool = AnyPoolOptions::new()
        .max_connections(max_conns)
        .connect(&effective_url)
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

/// For a file-based SQLite URL, ensure the parent directory exists.
/// No-op for in-memory or PostgreSQL URLs.
fn ensure_sqlite_dir(url: &str) -> anyhow::Result<()> {
    let path_str = url
        .strip_prefix("sqlite://")
        .or_else(|| url.strip_prefix("sqlite:"))
        .unwrap_or("");

    // Strip any query string before treating as a path
    let path_str = path_str.split('?').next().unwrap_or(path_str);

    if path_str.is_empty() || path_str.contains(":memory:") || path_str.starts_with("file::") {
        return Ok(());
    }

    let path = std::path::Path::new(path_str);
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent)?;
        }
    }
    Ok(())
}

/// For a file-based SQLite URL without ?mode=rwc, append it so sqlx creates
/// the database file if it does not already exist.
fn sqlite_create_if_missing(url: &str) -> String {
    if !url.starts_with("sqlite:") || url.contains(":memory:") || url.contains("mode=") {
        return url.to_string();
    }
    if url.contains('?') {
        format!("{}&mode=rwc", url)
    } else {
        format!("{}?mode=rwc", url)
    }
}
