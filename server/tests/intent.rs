//! Intent integration tests
//! Covers: SPEC-030, SPEC-031, SPEC-032, SPEC-033, SPEC-034, SPEC-035

mod helpers;
use axum::http::StatusCode;
use serde_json::json;
use wiremock::{
    matchers::{method, path},
    Mock, MockServer, ResponseTemplate,
};

const TEST_ADDR: &str = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const VALID_CALLDATA: &str = "0xa9059cbb000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa960450000000000000000000000000000000000000000000000000de0b6b3a7640000";

/// Full setup: login → create account → issue session key → return (server, token, session_id).
async fn setup_intent(server: &axum_test::TestServer, email: &str) -> (String, String) {
    let (token, _) = helpers::login(server, email).await;

    let account_res = server
        .post("/account/create")
        .add_header("Authorization", format!("Bearer {token}"))
        .json(&json!({ "chain": "base", "address": TEST_ADDR }))
        .await;
    let account_id = account_res.json::<serde_json::Value>()["account_id"]
        .as_str()
        .unwrap()
        .to_string();

    let session_res = server
        .post("/session-key/issue")
        .add_header("Authorization", format!("Bearer {token}"))
        .json(&json!({
            "account_id": account_id,
            "key_hash": "a".repeat(64),
            "allowed_targets": [TEST_ADDR],
            "allowed_selectors": ["0xa9059cbb"],
            "max_value_wei": "1000000000000000000",
            "ttl_seconds": 3600
        }))
        .await;
    let session_id = session_res.json::<serde_json::Value>()["session_id"]
        .as_str()
        .unwrap()
        .to_string();

    (token, session_id)
}

/// Start a wiremock server that accepts all Pimlico JSON-RPC calls.
async fn mock_bundler() -> MockServer {
    let server = MockServer::start().await;

    // pm_sponsorUserOperation → return a sponsored user op
    Mock::given(method("POST"))
        .and(path("/"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "jsonrpc": "2.0",
            "id": 1,
            "result": {
                "sender": TEST_ADDR,
                "nonce": "0x0",
                "callData": VALID_CALLDATA,
                "paymasterAndData": "0xdeadbeef"
            }
        })))
        .mount(&server)
        .await;

    server
}

// SPEC-030: execute intent returns 202 ACCEPTED with intent_id + pending status
#[tokio::test]
async fn execute_intent_returns_202() {
    let bundler = mock_bundler().await;
    let server = helpers::test_server_with_bundler(&bundler.uri(), &bundler.uri()).await;
    let (token, session_id) = setup_intent(&server, "intent-execute@example.com").await;

    let res = server
        .post("/intent/execute")
        .add_header("Authorization", format!("Bearer {token}"))
        .json(&json!({
            "session_id": session_id,
            "target": TEST_ADDR,
            "calldata": VALID_CALLDATA,
            "value": "0",
            "user_operation": {}
        }))
        .await;

    res.assert_status(StatusCode::ACCEPTED);
    let body = res.json::<serde_json::Value>();
    assert!(body["intent_id"].is_string(), "intent_id missing");
    assert_eq!(body["status"], "pending");
}

// SPEC-031: get intent status returns current state
#[tokio::test]
async fn get_intent_status_returns_intent() {
    let bundler = mock_bundler().await;
    let server = helpers::test_server_with_bundler(&bundler.uri(), &bundler.uri()).await;
    let (token, session_id) = setup_intent(&server, "intent-status@example.com").await;

    let execute_res = server
        .post("/intent/execute")
        .add_header("Authorization", format!("Bearer {token}"))
        .json(&json!({
            "session_id": session_id,
            "target": TEST_ADDR,
            "calldata": VALID_CALLDATA,
            "value": "0",
            "user_operation": {}
        }))
        .await;
    let intent_id = execute_res.json::<serde_json::Value>()["intent_id"]
        .as_str()
        .unwrap()
        .to_string();

    let status_res = server
        .get(&format!("/intent/{intent_id}/status"))
        .add_header("Authorization", format!("Bearer {token}"))
        .await;

    status_res.assert_status_ok();
    let body = status_res.json::<serde_json::Value>();
    assert_eq!(body["intent_id"], intent_id);
    assert!(body["status"].is_string());
}

// SPEC-032: get unknown intent → 404
#[tokio::test]
async fn get_intent_status_unknown_returns_404() {
    let server = helpers::test_server().await;
    let (token, _) = helpers::login(&server, "intent-404@example.com").await;

    let res = server
        .get("/intent/00000000-0000-0000-0000-000000000000/status")
        .add_header("Authorization", format!("Bearer {token}"))
        .await;

    res.assert_status(StatusCode::NOT_FOUND);
}

// SPEC-033: get intent owned by another user → 403
#[tokio::test]
async fn get_intent_status_wrong_owner_returns_403() {
    let bundler = mock_bundler().await;
    let server = helpers::test_server_with_bundler(&bundler.uri(), &bundler.uri()).await;
    let (token_a, session_id) = setup_intent(&server, "intent-owner@example.com").await;
    let (token_b, _) = helpers::login(&server, "intent-intruder@example.com").await;

    let execute_res = server
        .post("/intent/execute")
        .add_header("Authorization", format!("Bearer {token_a}"))
        .json(&json!({
            "session_id": session_id,
            "target": TEST_ADDR,
            "calldata": VALID_CALLDATA,
            "value": "0",
            "user_operation": {}
        }))
        .await;
    let intent_id = execute_res.json::<serde_json::Value>()["intent_id"]
        .as_str()
        .unwrap()
        .to_string();

    let res = server
        .get(&format!("/intent/{intent_id}/status"))
        .add_header("Authorization", format!("Bearer {token_b}"))
        .await;

    res.assert_status(StatusCode::FORBIDDEN);
}

// SPEC-034: invalid calldata → 400
#[tokio::test]
async fn execute_intent_invalid_calldata_returns_400() {
    let server = helpers::test_server().await;
    let (token, session_id) = setup_intent(&server, "intent-badcalldata@example.com").await;

    let res = server
        .post("/intent/execute")
        .add_header("Authorization", format!("Bearer {token}"))
        .json(&json!({
            "session_id": session_id,
            "target": TEST_ADDR,
            "calldata": "not-valid-hex!!!",
            "value": "0",
            "user_operation": {}
        }))
        .await;

    res.assert_status(StatusCode::BAD_REQUEST);
}

// SPEC-035: no auth → 401
#[tokio::test]
async fn execute_intent_no_auth_returns_401() {
    let server = helpers::test_server().await;

    let res = server
        .post("/intent/execute")
        .json(&json!({
            "session_id": "00000000-0000-0000-0000-000000000000",
            "target": TEST_ADDR,
            "calldata": VALID_CALLDATA,
            "value": "0",
            "user_operation": {}
        }))
        .await;

    res.assert_status(StatusCode::UNAUTHORIZED);
}

// Unknown session → 404
#[tokio::test]
async fn execute_intent_unknown_session_returns_404() {
    let server = helpers::test_server().await;
    let (token, _) = helpers::login(&server, "intent-nosession@example.com").await;

    let res = server
        .post("/intent/execute")
        .add_header("Authorization", format!("Bearer {token}"))
        .json(&json!({
            "session_id": "00000000-0000-0000-0000-000000000000",
            "target": TEST_ADDR,
            "calldata": VALID_CALLDATA,
            "value": "0",
            "user_operation": {}
        }))
        .await;

    res.assert_status(StatusCode::NOT_FOUND);
}

// Target outside allowed scope → 403
#[tokio::test]
async fn execute_intent_out_of_scope_target_returns_403() {
    let server = helpers::test_server().await;
    let (token, session_id) = setup_intent(&server, "intent-scope@example.com").await;

    let res = server
        .post("/intent/execute")
        .add_header("Authorization", format!("Bearer {token}"))
        .json(&json!({
            "session_id": session_id,
            "target": "0x000000000000000000000000000000000000dead",
            "calldata": VALID_CALLDATA,
            "value": "0",
            "user_operation": {}
        }))
        .await;

    res.assert_status(StatusCode::FORBIDDEN);
}

// Value above session max → 403
#[tokio::test]
async fn execute_intent_value_exceeds_limit_returns_403() {
    let server = helpers::test_server().await;
    let (token, session_id) = setup_intent(&server, "intent-value@example.com").await;

    let res = server
        .post("/intent/execute")
        .add_header("Authorization", format!("Bearer {token}"))
        .json(&json!({
            "session_id": session_id,
            "target": TEST_ADDR,
            "calldata": VALID_CALLDATA,
            "value": "9999999999999999999999",
            "user_operation": {}
        }))
        .await;

    res.assert_status(StatusCode::FORBIDDEN);
}
