use reqwest::Client;
use serde_json::{json, Value};

use crate::config::ChainConfig;

/// Adapter for Base chain interactions via Pimlico bundler/paymaster.
/// Wraps JSON-RPC calls to eth_sendUserOperation and pm_sponsorUserOperation.
pub struct ChainAdapter {
    client: Client,
    bundler_url: String,
    paymaster_url: String,
    pub entry_point: String,
    pub chain_id: u64,
}

impl ChainAdapter {
    pub fn new(config: &ChainConfig) -> Self {
        Self {
            client: Client::new(),
            bundler_url: config.bundler_url.clone(),
            paymaster_url: config.paymaster_url.clone(),
            entry_point: config.entry_point.clone(),
            chain_id: config.chain_id,
        }
    }

    /// Request Pimlico paymaster sponsorship for a UserOperation.
    /// Returns the paymaster-augmented UserOperation.
    pub async fn sponsor_user_operation(&self, user_op: &Value) -> anyhow::Result<Value> {
        let payload = json!({
            "jsonrpc": "2.0",
            "method": "pm_sponsorUserOperation",
            "params": [user_op, self.entry_point],
            "id": 1
        });
        let res: Value = self.client
            .post(&self.paymaster_url)
            .json(&payload)
            .send().await?
            .json().await?;
        res.get("result").cloned()
            .ok_or_else(|| anyhow::anyhow!("paymaster error: {:?}", res.get("error")))
    }

    /// Submit a signed UserOperation to the Pimlico bundler.
    /// Returns the userOpHash.
    pub async fn send_user_operation(&self, user_op: &Value) -> anyhow::Result<String> {
        let payload = json!({
            "jsonrpc": "2.0",
            "method": "eth_sendUserOperation",
            "params": [user_op, self.entry_point],
            "id": 1
        });
        let res: Value = self.client
            .post(&self.bundler_url)
            .json(&payload)
            .send().await?
            .json().await?;
        res.get("result")
            .and_then(|r| r.as_str())
            .map(|s| s.to_string())
            .ok_or_else(|| anyhow::anyhow!("bundler error: {:?}", res.get("error")))
    }

    /// Poll for a UserOperation receipt. Returns None if not yet confirmed.
    pub async fn get_operation_receipt(&self, user_op_hash: &str) -> anyhow::Result<Option<Value>> {
        let payload = json!({
            "jsonrpc": "2.0",
            "method": "eth_getUserOperationReceipt",
            "params": [user_op_hash],
            "id": 1
        });
        let res: Value = self.client
            .post(&self.bundler_url)
            .json(&payload)
            .send().await?
            .json().await?;
        Ok(res.get("result").cloned())
    }
}
