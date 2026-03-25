use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};

pub type Db = SqlitePool;

pub async fn connect(url: &str) -> anyhow::Result<Db> {
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(url)
        .await?;
    Ok(pool)
}

pub async fn migrate(pool: &Db) -> anyhow::Result<()> {
    sqlx::migrate!("./migrations").run(pool).await?;
    Ok(())
}
