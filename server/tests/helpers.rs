use axum_test::TestServer;
use ghostkey::db::Db;
use ghostkey::{config::*, db, routes};

pub async fn test_server() -> TestServer {
    test_server_with_bundler(
        "https://test.bundler.example",
        "https://test.paymaster.example",
    )
    .await
}

pub async fn test_server_with_bundler(bundler_url: &str, paymaster_url: &str) -> TestServer {
    let (server, _pool) = test_server_and_db_with_bundler(bundler_url, paymaster_url).await;
    server
}

/// Returns both the test server and the underlying DB pool, for tests that
/// need to seed or inspect the database directly.
pub async fn test_server_and_db() -> (TestServer, Db) {
    test_server_and_db_with_bundler(
        "https://test.bundler.example",
        "https://test.paymaster.example",
    )
    .await
}

pub async fn test_server_and_db_with_bundler(
    bundler_url: &str,
    paymaster_url: &str,
) -> (TestServer, Db) {
    let config = Config {
        server: ServerConfig {
            host: "127.0.0.1".to_string(),
            port: 0,
            cors_origins: vec!["http://localhost:3000".to_string()],
            log_format: "pretty".to_string(),
        },
        database: DatabaseConfig {
            url: "sqlite::memory:".to_string(),
        },
        auth: AuthConfig {
            jwt_secret: "test-secret-minimum-32-characters!!".to_string(),
            session_ttl_seconds: 3600,
        },
        chains: ChainsConfig {
            base: ChainConfig {
                rpc_url: "https://sepolia.base.org".to_string(),
                chain_id: 84532,
                bundler_url: bundler_url.to_string(),
                paymaster_url: paymaster_url.to_string(),
                entry_point: "0x0000000071727De22E5E9d8BAf0edAc6f37da032".to_string(),
            },
        },
    };

    let pool = db::connect(&config.database.url).await.expect("test db");
    db::migrate(&pool, &config.database.url)
        .await
        .expect("test migrations");
    let app = routes::build(pool.clone(), config);
    (TestServer::new(app).expect("test server"), pool)
}

/// Register a test user and return their auth token.
pub async fn login(server: &TestServer, email: &str) -> (String, String) {
    let res = server
        .post("/auth/login")
        .json(&serde_json::json!({ "method": "email", "credential": email }))
        .await;
    let body = res.json::<serde_json::Value>();
    let token = body["token"].as_str().unwrap().to_string();
    let user_id = body["user_id"].as_str().unwrap().to_string();
    (token, user_id)
}
