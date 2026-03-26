//! Health endpoint integration tests
//! Covers: #65 — 200 when healthy, 503 when DB is unreachable

mod helpers;

// #65 (happy path): health returns 200 + correct fields when DB is up
#[tokio::test]
async fn health_returns_200_and_correct_fields_when_healthy() {
    let server = helpers::test_server().await;
    let res = server.get("/health").await;

    res.assert_status_ok();
    let body = res.json::<serde_json::Value>();
    assert_eq!(body["status"], "ok");
    assert_eq!(body["db"], "ok");
    assert!(body["version"].is_string(), "version must be present");
    assert!(
        body["chains"]["base"].is_string(),
        "chains.base must be present"
    );
}

// #65 (degraded path): health returns 503 + degraded status when DB is unreachable
#[tokio::test]
async fn health_returns_503_when_db_is_down() {
    let (server, pool) = helpers::test_server_and_db().await;

    // Close all DB connections — subsequent SELECT 1 checks will fail
    pool.close().await;

    let res = server.get("/health").await;

    res.assert_status(axum::http::StatusCode::SERVICE_UNAVAILABLE);
    let body = res.json::<serde_json::Value>();
    assert_eq!(
        body["status"], "degraded",
        "status must be degraded when DB is down"
    );
    assert_eq!(
        body["db"], "error",
        "db field must be error when DB is down"
    );
    assert!(
        body["version"].is_string(),
        "version must still be present when degraded"
    );
}
