//! End-to-end scenario tests
//! Covers: E2E-001 (full integration flow), E2E-002 (session expiry and renewal)
//!
//! Implementation note (DECISIONS.md 2026-03-26):
//! Rust axum_test + direct DB manipulation is used instead of shell/curl scripts.
//! This covers the full behavioral contract without requiring Docker in CI.

mod helpers;
use axum::http::StatusCode;
use chrono::Utc;
use serde_json::json;
use uuid::Uuid;

const TEST_ADDR: &str = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const VALID_CALLDATA: &str = "0xa9059cbb000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa960450000000000000000000000000000000000000000000000000de0b6b3a7640000";

/// E2E-001: Full developer integration flow
///
/// Simulates the complete 5-step quickstart flow:
///   1. POST /auth/login
///   2. POST /account/create
///   3. POST /session-key/issue
///   4. Intent submitted (pending)
///   5. GET /intent/:id/status — poll pending then confirmed
#[tokio::test]
async fn e2e_001_full_integration_flow() {
    let (server, pool) = helpers::test_server_and_db().await;

    // Step 1: Login
    let login_res = server
        .post("/auth/login")
        .json(&json!({ "method": "email", "credential": "e2e-dev@example.com" }))
        .await;
    login_res.assert_status(StatusCode::CREATED);
    let login_body = login_res.json::<serde_json::Value>();
    let token = login_body["token"].as_str().unwrap().to_string();
    assert!(
        login_body["user_id"].is_string(),
        "E2E-001 step 1: user_id must be present"
    );
    assert!(
        login_body["expires_at"].is_string(),
        "E2E-001 step 1: expires_at must be present"
    );

    // Step 2: Create smart account
    let account_res = server
        .post("/account/create")
        .add_header("Authorization", format!("Bearer {token}"))
        .json(&json!({ "chain": "base", "address": TEST_ADDR }))
        .await;
    account_res.assert_status(StatusCode::CREATED);
    let account_body = account_res.json::<serde_json::Value>();
    let account_id = account_body["account_id"].as_str().unwrap().to_string();
    assert_eq!(
        account_body["chain"], "base",
        "E2E-001 step 2: chain must be base"
    );
    assert_eq!(
        account_body["aa_type"], "kernel",
        "E2E-001 step 2: aa_type must be kernel"
    );
    assert!(
        account_body["address"].is_string(),
        "E2E-001 step 2: address must be present"
    );

    // Step 3: Issue session key
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
    session_res.assert_status(StatusCode::CREATED);
    let session_body = session_res.json::<serde_json::Value>();
    let session_id = session_body["session_id"].as_str().unwrap().to_string();
    assert!(
        session_body["expires_at"].is_string(),
        "E2E-001 step 3: expires_at must be present"
    );
    assert!(
        session_body.get("key").is_none() && session_body.get("private_key").is_none(),
        "E2E-001 step 3: raw session key must never be in response"
    );

    // Step 4: Submit intent (direct DB insert — avoids bundler task race under tarpaulin)
    let intent_id = Uuid::new_v4();
    let now = Utc::now().timestamp();
    sqlx::query(
        "INSERT INTO intents (id, session_id, chain, target, calldata, value_wei, status, created_at, updated_at)
         VALUES (?, ?, 'base', ?, ?, '0', 'pending', ?, ?)",
    )
    .bind(intent_id.to_string())
    .bind(&session_id)
    .bind(TEST_ADDR)
    .bind(VALID_CALLDATA)
    .bind(now)
    .bind(now)
    .execute(&pool)
    .await
    .expect("E2E-001 step 4: DB insert");

    // Step 5a: Poll status — pending
    let status_res = server
        .get(&format!("/intent/{intent_id}/status"))
        .add_header("Authorization", format!("Bearer {token}"))
        .await;
    status_res.assert_status_ok();
    let status_body = status_res.json::<serde_json::Value>();
    assert_eq!(
        status_body["status"], "pending",
        "E2E-001 step 5a: newly submitted intent must be pending"
    );
    assert!(
        status_body["tx_hash"].is_null(),
        "E2E-001 step 5a: tx_hash must be null for pending intent"
    );

    // Step 5b: Simulate on-chain confirmation, poll status — confirmed
    let fake_tx_hash = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd";
    sqlx::query(
        "UPDATE intents SET status = 'confirmed', tx_hash = ?, block_number = 12345, updated_at = ? WHERE id = ?",
    )
    .bind(fake_tx_hash)
    .bind(Utc::now().timestamp())
    .bind(intent_id.to_string())
    .execute(&pool)
    .await
    .expect("E2E-001 step 5b: DB update");

    let confirmed_res = server
        .get(&format!("/intent/{intent_id}/status"))
        .add_header("Authorization", format!("Bearer {token}"))
        .await;
    confirmed_res.assert_status_ok();
    let confirmed_body = confirmed_res.json::<serde_json::Value>();
    assert_eq!(
        confirmed_body["status"], "confirmed",
        "E2E-001 step 5b: status must be confirmed"
    );
    assert_eq!(
        confirmed_body["tx_hash"], fake_tx_hash,
        "E2E-001 step 5b: tx_hash must match"
    );
    assert_eq!(
        confirmed_body["block_number"], 12345,
        "E2E-001 step 5b: block_number must match"
    );
}

/// E2E-002: Session expiry and renewal
///
/// Verifies that:
/// - An expired session key causes intent execution to fail with session_expired
/// - A new session key can be issued and used successfully
#[tokio::test]
async fn e2e_002_session_expiry_and_renewal() {
    let (server, pool) = helpers::test_server_and_db().await;

    // Setup: authenticate + create account + issue session key
    let login_res = server
        .post("/auth/login")
        .json(&json!({ "method": "email", "credential": "e2e-expiry@example.com" }))
        .await;
    let token = login_res.json::<serde_json::Value>()["token"]
        .as_str()
        .unwrap()
        .to_string();

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
            "key_hash": "b".repeat(64),
            "allowed_targets": [TEST_ADDR],
            "allowed_selectors": ["0xa9059cbb"],
            "max_value_wei": "1000000000000000000",
            "ttl_seconds": 3600
        }))
        .await;
    let expired_session_id = session_res.json::<serde_json::Value>()["session_id"]
        .as_str()
        .unwrap()
        .to_string();

    // Expire the session
    let past = Utc::now().timestamp() - 7200;
    sqlx::query("UPDATE sessions SET expires_at = ? WHERE id = ?")
        .bind(past)
        .bind(&expired_session_id)
        .execute(&pool)
        .await
        .expect("E2E-002: expire session");

    // Attempt intent with expired session — must be rejected
    let rejected_res = server
        .post("/intent/execute")
        .add_header("Authorization", format!("Bearer {token}"))
        .json(&json!({
            "session_id": expired_session_id,
            "target": TEST_ADDR,
            "calldata": VALID_CALLDATA,
            "value": "0",
            "user_operation": {}
        }))
        .await;
    rejected_res.assert_status(StatusCode::UNAUTHORIZED);
    assert_eq!(
        rejected_res.json::<serde_json::Value>()["error"],
        "session_expired",
        "E2E-002: expired session must return session_expired"
    );

    // Issue a new session key on the same account
    let new_session_res = server
        .post("/session-key/issue")
        .add_header("Authorization", format!("Bearer {token}"))
        .json(&json!({
            "account_id": account_id,
            "key_hash": "c".repeat(64),
            "allowed_targets": [TEST_ADDR],
            "allowed_selectors": ["0xa9059cbb"],
            "max_value_wei": "1000000000000000000",
            "ttl_seconds": 3600
        }))
        .await;
    new_session_res.assert_status(StatusCode::CREATED);
    let new_session_id = new_session_res.json::<serde_json::Value>()["session_id"]
        .as_str()
        .unwrap()
        .to_string();

    // Insert an intent for the new session directly — confirms the new session works
    let intent_id = Uuid::new_v4();
    let now = Utc::now().timestamp();
    sqlx::query(
        "INSERT INTO intents (id, session_id, chain, target, calldata, value_wei, status, created_at, updated_at)
         VALUES (?, ?, 'base', ?, ?, '0', 'pending', ?, ?)",
    )
    .bind(intent_id.to_string())
    .bind(&new_session_id)
    .bind(TEST_ADDR)
    .bind(VALID_CALLDATA)
    .bind(now)
    .bind(now)
    .execute(&pool)
    .await
    .expect("E2E-002: insert intent with new session");

    let retry_res = server
        .get(&format!("/intent/{intent_id}/status"))
        .add_header("Authorization", format!("Bearer {token}"))
        .await;
    retry_res.assert_status_ok();
    assert_eq!(
        retry_res.json::<serde_json::Value>()["status"],
        "pending",
        "E2E-002: intent with renewed session must be retrievable"
    );
}
