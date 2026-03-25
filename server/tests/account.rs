//! Account integration tests
//! Covers: SPEC-010, SPEC-012, SPEC-013

mod helpers;
use axum::http::StatusCode;
use serde_json::json;

const TEST_ADDR: &str = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const TEST_ADDR_2: &str = "0xAbCdEf0123456789AbCdEf0123456789AbCdEf01";

// SPEC-010: create account returns 201 with address and chain
#[tokio::test]
async fn create_account_returns_201() {
    let server = helpers::test_server().await;
    let (token, _) = helpers::login(&server, "acct-new@example.com").await;
    let res = server.post("/account/create")
        .add_header("Authorization", format!("Bearer {token}"))
        .json(&json!({ "chain": "base", "address": TEST_ADDR }))
        .await;
    res.assert_status(StatusCode::CREATED);
    let body = res.json::<serde_json::Value>();
    assert!(body["account_id"].is_string());
    assert_eq!(body["address"], TEST_ADDR);
    assert_eq!(body["chain"], "base");
    assert_eq!(body["aa_type"], "kernel");
}

// SPEC-012: user B cannot fetch user A's account → 403
#[tokio::test]
async fn cannot_fetch_other_users_account() {
    let server = helpers::test_server().await;

    // User A creates an account
    let (token_a, _) = helpers::login(&server, "owner-a@example.com").await;
    let create_res = server.post("/account/create")
        .add_header("Authorization", format!("Bearer {token_a}"))
        .json(&json!({ "chain": "base", "address": TEST_ADDR }))
        .await;
    create_res.assert_status(StatusCode::CREATED);
    let account_id = create_res.json::<serde_json::Value>()["account_id"]
        .as_str().unwrap().to_string();

    // User B tries to fetch it
    let (token_b, _) = helpers::login(&server, "intruder-b@example.com").await;
    let res = server.get(&format!("/account/{account_id}"))
        .add_header("Authorization", format!("Bearer {token_b}"))
        .await;
    res.assert_status(StatusCode::FORBIDDEN);
    assert_eq!(res.json::<serde_json::Value>()["error"], "forbidden");
}

// SPEC-013: creating the same account (same user + chain) is idempotent → same account_id
#[tokio::test]
async fn duplicate_account_creation_is_idempotent() {
    let server = helpers::test_server().await;
    let (token, _) = helpers::login(&server, "idempotent@example.com").await;

    let first = server.post("/account/create")
        .add_header("Authorization", format!("Bearer {token}"))
        .json(&json!({ "chain": "base", "address": TEST_ADDR_2 }))
        .await;
    let second = server.post("/account/create")
        .add_header("Authorization", format!("Bearer {token}"))
        .json(&json!({ "chain": "base", "address": TEST_ADDR_2 }))
        .await;

    first.assert_status(StatusCode::CREATED);
    second.assert_status(StatusCode::OK);

    let first_body = first.json::<serde_json::Value>();
    let second_body = second.json::<serde_json::Value>();
    assert_eq!(first_body["account_id"], second_body["account_id"]);
    assert_eq!(first_body["address"], second_body["address"]);
}
