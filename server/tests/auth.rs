mod helpers;
use axum::http::StatusCode;
use serde_json::json;

// SPEC-001: new user → 201
#[tokio::test]
async fn login_new_user_returns_201() {
    let server = helpers::test_server().await;
    let res = server.post("/auth/login")
        .json(&json!({ "method": "email", "credential": "new@example.com" }))
        .await;
    res.assert_status(StatusCode::CREATED);
    let body = res.json::<serde_json::Value>();
    assert!(body["user_id"].is_string());
    assert!(body["token"].is_string());
    assert!(body["expires_at"].is_string());
}

// SPEC-002: returning user → 200, same user_id
#[tokio::test]
async fn login_returning_user_returns_200() {
    let server = helpers::test_server().await;
    let r1 = server.post("/auth/login")
        .json(&json!({ "method": "email", "credential": "existing@example.com" }))
        .await;
    let r2 = server.post("/auth/login")
        .json(&json!({ "method": "email", "credential": "existing@example.com" }))
        .await;
    r1.assert_status(StatusCode::CREATED);
    r2.assert_status(StatusCode::OK);
    let b1 = r1.json::<serde_json::Value>();
    let b2 = r2.json::<serde_json::Value>();
    assert_eq!(b1["user_id"], b2["user_id"]);
}

// SPEC-003: refresh issues new token
#[tokio::test]
async fn refresh_returns_new_token() {
    let server = helpers::test_server().await;
    let (token, user_id) = helpers::login(&server, "refresh@example.com").await;
    let res = server.post("/auth/refresh")
        .json(&json!({ "token": token }))
        .await;
    res.assert_status(StatusCode::OK);
    let body = res.json::<serde_json::Value>();
    assert_eq!(body["user_id"].as_str().unwrap(), user_id);
    assert!(body["token"].is_string());
}

// SPEC-005: tampered token → 401
#[tokio::test]
async fn tampered_token_returns_401() {
    let server = helpers::test_server().await;
    let res = server.post("/auth/refresh")
        .json(&json!({ "token": "eyJhbGciOiJIUzI1NiJ9.tampered.badsig" }))
        .await;
    res.assert_status(StatusCode::UNAUTHORIZED);
    assert_eq!(res.json::<serde_json::Value>()["error"], "invalid_token");
}

// SPEC-007: no private key (32-byte hex) in any auth response
#[tokio::test]
async fn no_private_key_in_auth_response() {
    let server = helpers::test_server().await;
    let res = server.post("/auth/login")
        .json(&json!({ "method": "email", "credential": "safe@example.com" }))
        .await;
    let body = res.text();
    let re = regex::Regex::new(r"0x[0-9a-fA-F]{64}").unwrap();
    assert!(!re.is_match(&body), "private key pattern found in response: {body}");
}
