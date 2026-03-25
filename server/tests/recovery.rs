//! Recovery integration tests
//! Covers: SPEC-040

mod helpers;
use axum::http::StatusCode;
use serde_json::json;

const TEST_ADDR: &str = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

// SPEC-040: recovery initiate returns 202 with instructions, no private key
#[tokio::test]
async fn recovery_initiate_returns_202() {
    let server = helpers::test_server().await;
    let (token, _) = helpers::login(&server, "recovery-user@example.com").await;

    server
        .post("/account/create")
        .add_header("Authorization", format!("Bearer {token}"))
        .json(&json!({ "chain": "base", "address": TEST_ADDR }))
        .await;

    let res = server
        .post("/recovery/init")
        .json(&json!({ "account_address": TEST_ADDR }))
        .await;

    res.assert_status(StatusCode::ACCEPTED);
    let body = res.json::<serde_json::Value>();
    assert!(body["recovery_id"].is_string());
    assert!(body["instructions"].is_string());
    assert_eq!(body["status"], "initiated");

    // Must never leak a private key
    let re = regex::Regex::new(r"0x[0-9a-fA-F]{64}").unwrap();
    assert!(!re.is_match(&res.text()), "private key pattern in recovery response");
}

// Recovery for unknown address returns 404
#[tokio::test]
async fn recovery_unknown_address_returns_404() {
    let server = helpers::test_server().await;
    let res = server
        .post("/recovery/init")
        .json(&json!({ "account_address": "0x0000000000000000000000000000000000000001" }))
        .await;
    res.assert_status(StatusCode::NOT_FOUND);
}
