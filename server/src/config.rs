use figment::{
    providers::{Env, Format, Toml},
    Figment,
};
use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub server: ServerConfig,
    pub database: DatabaseConfig,
    pub auth: AuthConfig,
    pub chains: ChainsConfig,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ServerConfig {
    #[serde(default = "default_host")]
    pub host: String,
    #[serde(default = "default_port")]
    pub port: u16,
    /// Allowed CORS origins. Defaults to localhost:3000 for local dev.
    #[serde(default = "default_cors_origins")]
    pub cors_origins: Vec<String>,
    /// Log format: "pretty" (default) or "json" (for production/structured logging).
    #[serde(default = "default_log_format")]
    pub log_format: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DatabaseConfig {
    #[serde(default = "default_db_url")]
    pub url: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AuthConfig {
    pub jwt_secret: String,
    #[serde(default = "default_session_ttl")]
    pub session_ttl_seconds: u64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ChainsConfig {
    pub base: ChainConfig,
    /// Arbitrum One (42161) — optional; enabled by setting ARBITRUM_* env vars.
    pub arbitrum: Option<ChainConfig>,
    /// Ethereum mainnet (1) — optional; enabled by setting ETHEREUM_* env vars.
    pub ethereum: Option<ChainConfig>,
}

impl ChainsConfig {
    /// Returns all configured chains as `(chain_name, config)` pairs.
    pub fn all(&self) -> Vec<(&'static str, &ChainConfig)> {
        let mut chains = vec![("base", &self.base)];
        if let Some(ref a) = self.arbitrum {
            chains.push(("arbitrum", a));
        }
        if let Some(ref e) = self.ethereum {
            chains.push(("ethereum", e));
        }
        chains
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct ChainConfig {
    pub rpc_url: String,
    pub chain_id: u64,
    pub bundler_url: String,
    pub paymaster_url: String,
    pub entry_point: String,
}

fn default_cors_origins() -> Vec<String> {
    vec!["http://localhost:3000".to_string()]
}
fn default_log_format() -> String {
    "pretty".to_string()
}

fn default_host() -> String {
    "0.0.0.0".to_string()
}
fn default_port() -> u16 {
    8080
}
fn default_db_url() -> String {
    "sqlite:./db/ghostkey.db".to_string()
}
fn default_session_ttl() -> u64 {
    3600
}

impl Config {
    pub fn load() -> anyhow::Result<Self> {
        let config = Figment::new()
            .merge(Toml::file("config.toml"))
            .merge(Env::prefixed("GHOSTKEY_").split("__"))
            // Allow top-level env vars for secrets
            .merge(Env::raw().only(&[
                "JWT_SECRET",
                "BASE_RPC_URL",
                "BASE_BUNDLER_URL",
                "BASE_PAYMASTER_URL",
                "ARBITRUM_RPC_URL",
                "ARBITRUM_BUNDLER_URL",
                "ARBITRUM_PAYMASTER_URL",
                "ETHEREUM_RPC_URL",
                "ETHEREUM_BUNDLER_URL",
                "ETHEREUM_PAYMASTER_URL",
            ]))
            .extract()?;
        Ok(config)
    }
}
