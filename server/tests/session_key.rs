//! Session key integration tests
//! Covers: SPEC-020, SPEC-021, SPEC-022, SPEC-023

mod helpers;
use axum::http::StatusCode;
use serde_json::json;

const TEST_ADDR: &str = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

async fn setup_account(server: &axum_test::TestServer, email: &str) -> (String, String, String) {
    let (token, user_id) = helpers::login(server, email).await;
    let res = server
        .post("/account/create")
        .add_header("Authorization", format!("Bearer {token}"))
        .json(&json!({ "chain": "base", "address": TEST_ADDR }))
        .await;
    let account_id = res.json::<serde_json::Value>()["account_id"]
        .as_str()
        .unwrap()
        .to_string();
    (token, user_id, account_id)
}

// SPEC-020: issue session key returns 201 with session_id, key_hash, expires_at
#[tokio::test]
async fn issue_session_key_returns_201() {
    let server = helpers::test_server().await;
    let (token, _, account_id) = setup_account(&server, "sk-issue@example.com").await;

    let res = server
        .post("/session-key/issue")
        .add_header("Authorization", format!("Bearer {token}"))
        .json(&json!({
            "account_id": account_id,
            "key_hash": "a".repeat(64),
            "allowed_targets": ["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"],
            "allowed_selectors": ["0xa9059cbb"],
            "max_value_wei": "1000000000000000000",
            "ttl_seconds": 3600
        }))
        .await;

    res.assert_status(StatusCode::CREATED);
    let body = res.json::<serde_json::Value>();
    assert!(body["session_id"].is_string());
    assert_eq!(body["key_hash"], "a".repeat(64));
    assert!(body["expires_at"].is_string());
}

// SPEC-021: session key for another user's account → 403
#[tokio::test]
async fn issue_session_key_wrong_owner_returns_403() {
    let server = helpers::test_server().await;
    let (_, _, account_id) = setup_account(&server, "sk-owner@example.com").await;
    let (token_b, _) = helpers::login(&server, "sk-intruder@example.com").await;

    let res = server
        .post("/session-key/issue")
        .add_header("Authorization", format!("Bearer {token_b}"))
        .json(&json!({
            "account_id": account_id,
            "key_hash": "b".repeat(64),
            "allowed_targets": [],
            "allowed_selectors": [],
            "max_value_wei": "0",
            "ttl_seconds": 3600
        }))
        .await;

    res.assert_status(StatusCode::FORBIDDEN);
}

// SPEC-023: server returns key_hash (not raw key)
#[tokio::test]
async fn session_key_response_contains_hash_not_key() {
    let server = helpers::test_server().await;
    let (token, _, account_id) = setup_account(&server, "sk-hash@example.com").await;
    let key_hash = "deadbeef".repeat(8); // 64 hex chars

    let res = server
        .post("/session-key/issue")
        .add_header("Authorization", format!("Bearer {token}"))
        .json(&json!({
            "account_id": account_id,
            "key_hash": key_hash,
            "allowed_targets": [],
            "allowed_selectors": [],
            "max_value_wei": "0",
            "ttl_seconds": 60
        }))
        .await;

    res.assert_status(StatusCode::CREATED);
    let body = res.text();
    // Response must echo the hash, but must not contain a raw private key pattern
    let re = regex::Regex::new(r"0x[0-9a-fA-F]{64}").unwrap();
    assert!(
        !re.is_match(&body),
        "raw private key pattern found in response"
    );
}
