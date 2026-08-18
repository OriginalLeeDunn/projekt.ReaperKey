mod helpers;
use axum::http::StatusCode;
use k256::ecdsa::SigningKey;
use serde_json::json;
use std::str::FromStr;

/// Deterministic test key — worthless, well-known value, sufficient to
/// exercise real ECDSA signing + recovery in tests.
fn test_signing_key() -> SigningKey {
    SigningKey::from_bytes(&[0x11; 32].into()).unwrap()
}

/// EIP-55 checksummed address — the `siwe` crate's parser requires this
/// exact casing on the address line, matching what a real wallet (viem's
/// `getAddress()`, MetaMask) always produces.
fn signer_address(key: &SigningKey) -> String {
    use sha3::{Digest, Keccak256};
    let point = key.verifying_key().to_encoded_point(false);
    let hash = Keccak256::digest(&point.as_bytes()[1..]);
    let addr: [u8; 20] = hash[12..].try_into().unwrap();
    siwe::eip55(&addr)
}

/// Signs `message` the way a wallet's `personal_sign` would: EIP-191 prefix
/// (handled by siwe's `eip191_hash`), recoverable ECDSA, v as 27/28.
fn sign_siwe(key: &SigningKey, message: &siwe::Message) -> [u8; 65] {
    let hash = message.eip191_hash().unwrap();
    let (sig, recid) = key.sign_prehash_recoverable(&hash).unwrap();
    let mut out = [0u8; 65];
    out[..64].copy_from_slice(&sig.to_bytes());
    out[64] = recid.to_byte() + 27;
    out
}

async fn get_nonce(server: &axum_test::TestServer) -> String {
    let res = server.get("/auth/wallet/nonce").await;
    res.assert_status(StatusCode::OK);
    res.json::<serde_json::Value>()["nonce"]
        .as_str()
        .unwrap()
        .to_string()
}

fn build_message(address: &str, nonce: &str) -> siwe::Message {
    let text = format!(
        "localhost:3000 wants you to sign in with your Ethereum account:\n{address}\n\nSign in to GhostKey\n\nURI: http://localhost:3000\nVersion: 1\nChain ID: 84532\nNonce: {nonce}\nIssued At: {issued_at}",
        issued_at = chrono::Utc::now().to_rfc3339(),
    );
    siwe::Message::from_str(&text).expect("valid SIWE message")
}

#[tokio::test]
async fn wallet_login_new_user_returns_201() {
    let server = helpers::test_server().await;
    let key = test_signing_key();
    let address = signer_address(&key);
    let nonce = get_nonce(&server).await;
    let message = build_message(&address, &nonce);
    let sig = sign_siwe(&key, &message);

    let res = server
        .post("/auth/login")
        .json(&json!({
            "method": "wallet",
            "credential": message.to_string(),
            "signature": format!("0x{}", hex::encode(sig)),
        }))
        .await;

    res.assert_status(StatusCode::CREATED);
    let body = res.json::<serde_json::Value>();
    assert!(body["user_id"].is_string());
    assert!(body["token"].is_string());
}

#[tokio::test]
async fn wallet_login_returning_user_same_id() {
    let server = helpers::test_server().await;
    let key = test_signing_key();
    let address = signer_address(&key);

    let nonce1 = get_nonce(&server).await;
    let message1 = build_message(&address, &nonce1);
    let sig1 = sign_siwe(&key, &message1);
    let r1 = server
        .post("/auth/login")
        .json(&json!({
            "method": "wallet",
            "credential": message1.to_string(),
            "signature": format!("0x{}", hex::encode(sig1)),
        }))
        .await;
    r1.assert_status(StatusCode::CREATED);

    let nonce2 = get_nonce(&server).await;
    let message2 = build_message(&address, &nonce2);
    let sig2 = sign_siwe(&key, &message2);
    let r2 = server
        .post("/auth/login")
        .json(&json!({
            "method": "wallet",
            "credential": message2.to_string(),
            "signature": format!("0x{}", hex::encode(sig2)),
        }))
        .await;
    r2.assert_status(StatusCode::OK);

    assert_eq!(
        r1.json::<serde_json::Value>()["user_id"],
        r2.json::<serde_json::Value>()["user_id"]
    );
}

// A signature from a DIFFERENT key than the address claimed in the message
// must be rejected — this is the actual security property under test.
#[tokio::test]
async fn wallet_login_wrong_signer_returns_401() {
    let server = helpers::test_server().await;
    let claimed_key = test_signing_key();
    let claimed_address = signer_address(&claimed_key);
    let attacker_key = SigningKey::from_bytes(&[0x22; 32].into()).unwrap();

    let nonce = get_nonce(&server).await;
    let message = build_message(&claimed_address, &nonce);
    let sig = sign_siwe(&attacker_key, &message); // signed by the wrong key

    let res = server
        .post("/auth/login")
        .json(&json!({
            "method": "wallet",
            "credential": message.to_string(),
            "signature": format!("0x{}", hex::encode(sig)),
        }))
        .await;

    res.assert_status(StatusCode::UNAUTHORIZED);
}

// A nonce this server never issued must be rejected.
#[tokio::test]
async fn wallet_login_unknown_nonce_returns_401() {
    let server = helpers::test_server().await;
    let key = test_signing_key();
    let address = signer_address(&key);

    let message = build_message(&address, "never-issued-by-server");
    let sig = sign_siwe(&key, &message);

    let res = server
        .post("/auth/login")
        .json(&json!({
            "method": "wallet",
            "credential": message.to_string(),
            "signature": format!("0x{}", hex::encode(sig)),
        }))
        .await;

    res.assert_status(StatusCode::UNAUTHORIZED);
}

// A nonce can't be replayed — second use of the same nonce is rejected.
#[tokio::test]
async fn wallet_login_replayed_nonce_returns_401() {
    let server = helpers::test_server().await;
    let key = test_signing_key();
    let address = signer_address(&key);
    let nonce = get_nonce(&server).await;
    let message = build_message(&address, &nonce);
    let sig = sign_siwe(&key, &message);

    let payload = json!({
        "method": "wallet",
        "credential": message.to_string(),
        "signature": format!("0x{}", hex::encode(sig)),
    });

    let r1 = server.post("/auth/login").json(&payload).await;
    r1.assert_status(StatusCode::CREATED);

    let r2 = server.post("/auth/login").json(&payload).await;
    r2.assert_status(StatusCode::UNAUTHORIZED);
}

// A message signed for a different domain (phishing/relay scenario) is rejected
// even with a valid nonce and a correctly matching signature.
#[tokio::test]
async fn wallet_login_wrong_domain_returns_401() {
    let server = helpers::test_server().await;
    let key = test_signing_key();
    let address = signer_address(&key);
    let nonce = get_nonce(&server).await;

    let text = format!(
        "evil-phishing-site.com wants you to sign in with your Ethereum account:\n{address}\n\nSign in\n\nURI: http://evil-phishing-site.com\nVersion: 1\nChain ID: 84532\nNonce: {nonce}\nIssued At: {issued_at}",
        issued_at = chrono::Utc::now().to_rfc3339(),
    );
    let message = siwe::Message::from_str(&text).unwrap();
    let sig = sign_siwe(&key, &message);

    let res = server
        .post("/auth/login")
        .json(&json!({
            "method": "wallet",
            "credential": message.to_string(),
            "signature": format!("0x{}", hex::encode(sig)),
        }))
        .await;

    res.assert_status(StatusCode::UNAUTHORIZED);
}

// No private key or signature material should ever be echoed back.
#[tokio::test]
async fn wallet_login_no_signature_in_response() {
    let server = helpers::test_server().await;
    let key = test_signing_key();
    let address = signer_address(&key);
    let nonce = get_nonce(&server).await;
    let message = build_message(&address, &nonce);
    let sig = sign_siwe(&key, &message);
    let sig_hex = hex::encode(sig);

    let res = server
        .post("/auth/login")
        .json(&json!({
            "method": "wallet",
            "credential": message.to_string(),
            "signature": format!("0x{sig_hex}"),
        }))
        .await;

    let body = res.text();
    assert!(
        !body.contains(&sig_hex),
        "signature leaked into response: {body}"
    );
}
