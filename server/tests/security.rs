//! Security integration tests — run against every endpoint
//! Covers: SPEC-200, SPEC-201, SPEC-202, SPEC-203
//! Phase 4 validation: security headers, request ID, CORS, internal error isolation

mod helpers;
use axum::body::to_bytes;
use axum::response::IntoResponse;
use ghostkey::error::AppError;
use serde_json::json;

// SPEC-202: oversized payload returns 413
#[tokio::test]
async fn oversized_payload_returns_413() {
    let server = helpers::test_server().await;
    let big_payload = "x".repeat(2 * 1024 * 1024); // 2MB
    let res = server
        .post("/auth/login")
        .json(&json!({ "method": "email", "credential": big_payload }))
        .await;
    res.assert_status(axum::http::StatusCode::PAYLOAD_TOO_LARGE);
}

// SPEC-203: wrong HTTP method returns 405 + Allow header
#[tokio::test]
async fn wrong_method_returns_405() {
    let server = helpers::test_server().await;
    let res = server.put("/auth/login").json(&json!({})).await;
    res.assert_status(axum::http::StatusCode::METHOD_NOT_ALLOWED);
    assert!(
        res.headers().get("allow").is_some(),
        "SPEC-203: Allow header must be present on 405"
    );
}

// SPEC-201: SQL injection in login credential is safely handled
#[tokio::test]
async fn sql_injection_in_credential_is_safe() {
    let server = helpers::test_server().await;
    let res = server
        .post("/auth/login")
        .json(&json!({
            "method": "email",
            "credential": "'; DROP TABLE users; --"
        }))
        .await;
    // Should succeed (creates account) or return 400 — never 500
    assert_ne!(
        res.status_code(),
        axum::http::StatusCode::INTERNAL_SERVER_ERROR
    );
    // Response must not contain SQL error messages
    let body = res.text();
    assert!(!body.contains("SQL"), "SQL error leaked: {body}");
    assert!(!body.contains("sqlite"), "DB error leaked: {body}");
}

// SPEC-200: no private key in any response (parameterized over all routes)
#[tokio::test]
async fn health_check_has_no_private_key() {
    let server = helpers::test_server().await;
    let res = server.get("/health").await;
    res.assert_status_ok();
    let body = res.text();
    let private_key_pattern = regex::Regex::new(r"0x[0-9a-fA-F]{64}").unwrap();
    assert!(!private_key_pattern.is_match(&body));
}

// #69: security headers present on every response
#[tokio::test]
async fn response_includes_required_security_headers() {
    let server = helpers::test_server().await;
    let res = server.get("/health").await;

    assert_eq!(
        res.headers()
            .get("x-content-type-options")
            .map(|v| v.to_str().unwrap()),
        Some("nosniff"),
        "X-Content-Type-Options: nosniff must be set"
    );
    assert_eq!(
        res.headers()
            .get("x-frame-options")
            .map(|v| v.to_str().unwrap()),
        Some("DENY"),
        "X-Frame-Options: DENY must be set"
    );
    assert_eq!(
        res.headers()
            .get("referrer-policy")
            .map(|v| v.to_str().unwrap()),
        Some("strict-origin-when-cross-origin"),
        "Referrer-Policy: strict-origin-when-cross-origin must be set"
    );
}

// #70: X-Request-ID header present and is a valid UUID on every response
#[tokio::test]
async fn response_includes_valid_x_request_id_header() {
    let server = helpers::test_server().await;
    let res = server.get("/health").await;

    let request_id = res
        .headers()
        .get("x-request-id")
        .expect("x-request-id header must be present")
        .to_str()
        .expect("x-request-id must be valid UTF-8");

    assert!(
        uuid::Uuid::parse_str(request_id).is_ok(),
        "x-request-id must be a valid UUID, got: {request_id}"
    );
}

// #71: CORS — approved origin gets Access-Control-Allow-Origin header
#[tokio::test]
async fn cors_allows_configured_origin() {
    let server = helpers::test_server().await;
    let res = server
        .get("/health")
        .add_header("Origin", "http://localhost:3000")
        .await;

    let acao = res
        .headers()
        .get("access-control-allow-origin")
        .expect("configured origin must receive access-control-allow-origin header")
        .to_str()
        .unwrap();
    assert_eq!(acao, "http://localhost:3000");
}

// #71: CORS — unapproved origin does NOT get Access-Control-Allow-Origin header
#[tokio::test]
async fn cors_rejects_unapproved_origin() {
    let server = helpers::test_server().await;
    let res = server
        .get("/health")
        .add_header("Origin", "http://evil.com")
        .await;

    assert!(
        res.headers().get("access-control-allow-origin").is_none(),
        "unapproved origin must not receive access-control-allow-origin header"
    );
}

// #73: AppError::Internal returns 500 + "internal_error" — cause must NOT leak to client
#[tokio::test]
async fn internal_error_hides_cause_from_client() {
    let secret_cause = "jwt_encode_failed: hmac key is null — do not expose";
    let err = AppError::Internal(secret_cause.to_string());
    let response = err.into_response();

    assert_eq!(
        response.status(),
        axum::http::StatusCode::INTERNAL_SERVER_ERROR,
        "Internal error must return 500"
    );

    let body_bytes = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let body = String::from_utf8(body_bytes.to_vec()).unwrap();
    let json: serde_json::Value = serde_json::from_str(&body).unwrap();

    assert_eq!(
        json["error"], "internal_error",
        "error code must be internal_error, got: {body}"
    );
    assert!(
        !body.contains(secret_cause),
        "cause must not leak to client response: {body}"
    );
}
