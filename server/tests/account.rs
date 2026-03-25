//! Account integration tests
//! Covers: SPEC-010, SPEC-011, SPEC-012, SPEC-013

mod helpers;
use axum::http::StatusCode;
use serde_json::json;

// SPEC-010: create account returns 201 with counterfactual address
#[tokio::test]
#[ignore = "not yet implemented"]
async fn create_account_returns_201() {
    let server = helpers::test_server().await;
    // TODO: login first to get token
    let res = server.post("/account/create")
        .json(&json!({ "chain": "base" }))
        .await;
    res.assert_status(StatusCode::CREATED);
    let body = res.json::<serde_json::Value>();
    assert!(body["account_id"].is_string());
    assert!(body["address"].as_str().unwrap().starts_with("0x"));
    assert_eq!(body["chain"], "base");
    assert_eq!(body["aa_type"], "kernel");
}

// SPEC-012: user B cannot fetch user A's account
#[tokio::test]
#[ignore = "not yet implemented"]
async fn cannot_fetch_other_users_account() {
    let server = helpers::test_server().await;
    // TODO: create user A, create account, get account_id
    // TODO: login as user B
    // TODO: attempt GET /account/:id with user B's token
    let res = server.get("/account/00000000-0000-0000-0000-000000000000").await;
    res.assert_status(axum::http::StatusCode::FORBIDDEN);
    let body = res.json::<serde_json::Value>();
    assert_eq!(body["error"], "forbidden");
}

// SPEC-013: creating account twice is idempotent
#[tokio::test]
#[ignore = "not yet implemented"]
async fn duplicate_account_creation_is_idempotent() {
    let server = helpers::test_server().await;
    // TODO: login, create account twice, assert same address returned
    let first = server.post("/account/create")
        .json(&json!({ "chain": "base" }))
        .await;
    let second = server.post("/account/create")
        .json(&json!({ "chain": "base" }))
        .await;
    first.assert_status(StatusCode::CREATED);
    second.assert_status(StatusCode::OK);
    let first_body = first.json::<serde_json::Value>();
    let second_body = second.json::<serde_json::Value>();
    assert_eq!(first_body["address"], second_body["address"]);
    assert_eq!(first_body["account_id"], second_body["account_id"]);
}
