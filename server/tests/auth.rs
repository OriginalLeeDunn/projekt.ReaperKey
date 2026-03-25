mod helpers;
use axum::http::StatusCode;
use serde_json::json;

const TEST_SECRET: &str = "test-secret-minimum-32-characters!!";

// SPEC-001: new user → 201
#[tokio::test]
async fn login_new_user_returns_201() {
    let server = helpers::test_server().await;
    let res = server
        .post("/auth/login")
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
    let r1 = server
        .post("/auth/login")
        .json(&json!({ "method": "email", "credential": "existing@example.com" }))
        .await;
    let r2 = server
        .post("/auth/login")
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
    let res = server
        .post("/auth/refresh")
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
    let res = server
        .post("/auth/refresh")
        .json(&json!({ "token": "eyJhbGciOiJIUzI1NiJ9.tampered.badsig" }))
        .await;
    res.assert_status(StatusCode::UNAUTHORIZED);
    assert_eq!(res.json::<serde_json::Value>()["error"], "invalid_token");
}

// SPEC-007: no private key (32-byte hex) in any auth response
#[tokio::test]
async fn no_private_key_in_auth_response() {
    let server = helpers::test_server().await;
    let res = server
        .post("/auth/login")
        .json(&json!({ "method": "email", "credential": "safe@example.com" }))
        .await;
    let body = res.text();
    let re = regex::Regex::new(r"0x[0-9a-fA-F]{64}").unwrap();
    assert!(
        !re.is_match(&body),
        "private key pattern found in response: {body}"
    );
}

// SPEC-004: expired token → 401 with error "token_expired"
#[tokio::test]
async fn expired_token_returns_401() {
    let server = helpers::test_server().await;

    // Craft a JWT signed with the test secret but with exp in the past.
    // Use the concrete Claims struct so jsonwebtoken validates exp correctly.
    let expired_claims = ghostkey::auth_jwt::Claims {
        sub: "00000000-0000-0000-0000-000000000001".to_string(),
        exp: 1_000_000, // 1970-01-12 — definitely expired
        iat: 999_999,
    };
    let token = jsonwebtoken::encode(
        &jsonwebtoken::Header::default(),
        &expired_claims,
        &jsonwebtoken::EncodingKey::from_secret(TEST_SECRET.as_bytes()),
    )
    .unwrap();

    let res = server
        .post("/auth/refresh")
        .json(&json!({ "token": token }))
        .await;

    res.assert_status(StatusCode::UNAUTHORIZED);
    assert_eq!(res.json::<serde_json::Value>()["error"], "token_expired");
}

// SPEC-006: rate limit — 11th login from same IP returns 429
#[tokio::test]
async fn login_rate_limit_returns_429() {
    let server = helpers::test_server().await;

    // Rate limit is 10 req / 60s per IP key.
    // All requests hit "login:unknown" (no x-forwarded-for in test).
    for i in 0..10 {
        let res = server
            .post("/auth/login")
            .json(&json!({
                "method": "email",
                "credential": format!("ratelimit{i}@example.com"),
            }))
            .await;
        // First 10 must succeed (201 new user each time)
        res.assert_status(StatusCode::CREATED);
    }

    // 11th request — same "unknown" IP bucket, now exhausted
    let res = server
        .post("/auth/login")
        .json(&json!({ "method": "email", "credential": "overflow@example.com" }))
        .await;

    res.assert_status(StatusCode::TOO_MANY_REQUESTS);
    assert_eq!(res.json::<serde_json::Value>()["error"], "rate_limited");
    let retry_after = res.headers().get("retry-after");
    assert!(
        retry_after.is_some(),
        "Retry-After header must be present on 429"
    );
}
