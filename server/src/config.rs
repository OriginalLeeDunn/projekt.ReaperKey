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
}

#[derive(Debug, Clone, Deserialize)]
pub struct ChainConfig {
    pub rpc_url: String,
    pub chain_id: u64,
    pub bundler_url: String,
    pub paymaster_url: String,
    pub entry_point: String,
}

fn default_host() -> String {
    "0.0.0.0".to_string()
}
fn default_port() -> u16 {
    8080
}
fn default_db_url() -> String {
    "sqlite:./ghostkey.db".to_string()
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
            ]))
            .extract()?;
        Ok(config)
    }
}
