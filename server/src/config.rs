use figment::{
    providers::{Env, Format, Serialized, Toml},
    Figment,
};
use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    // `server` and `database` are wholly optional (every field inside has a
    // default) — #[serde(default)] here means figment doesn't need to see
    // *any* server.*/database.* key at all for those to still deserialize.
    // `auth` and `chains` are NOT defaulted: jwt_secret and chain RPC/bundler
    // URLs have no sensible default, so those sections must actually be
    // provided (via config.toml, GHOSTKEY__*, or the raw secret env vars).
    #[serde(default)]
    pub server: ServerConfig,
    #[serde(default)]
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
    /// Expected `domain` field on incoming SIWE (EIP-4361) sign-in messages —
    /// must match the frontend origin, not the API host. Rejects messages
    /// signed for a different site (phishing/relay protection).
    #[serde(default = "default_siwe_domain")]
    pub siwe_domain: String,
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            host: default_host(),
            port: default_port(),
            cors_origins: default_cors_origins(),
            log_format: default_log_format(),
            siwe_domain: default_siwe_domain(),
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct DatabaseConfig {
    #[serde(default = "default_db_url")]
    pub url: String,
}

impl Default for DatabaseConfig {
    fn default() -> Self {
        Self {
            url: default_db_url(),
        }
    }
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
fn default_siwe_domain() -> String {
    "localhost:3000".to_string()
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
        let mut config = Figment::new()
            .merge(Toml::file("config.toml"))
            // Prefix must be "GHOSTKEY__" (double underscore) to match the
            // "__" nesting separator below and the documented env var
            // convention (docs/deployment.md) — GHOSTKEY_SERVER__PORT (single
            // underscore prefix) stripped a mismatched amount and left a
            // leading "_" on the first segment, so no GHOSTKEY__* env var
            // ever actually reached the config (silently broken: every
            // deploy fell through to hardcoded defaults, and Docker/bare env
            // var overrides never worked at all).
            .merge(Env::prefixed("GHOSTKEY__").split("__"));

        // Secrets/URLs use short, unprefixed env var names (common with
        // secret managers and what docker-compose.yml actually sets) rather
        // than the verbose GHOSTKEY__ nesting. `Env::raw()` only ever
        // produces flat top-level keys, though — it can't place these into
        // `auth.jwt_secret` / `chains.<name>.rpc_url` on its own, so it was
        // merged in below but never actually reached any struct field
        // (silently a no-op). Map each one to its real nested path instead.
        if let Ok(v) = std::env::var("JWT_SECRET") {
            config = config.merge(Serialized::default("auth.jwt_secret", v));
        }
        for (chain, prefix) in [
            ("base", "BASE"),
            ("arbitrum", "ARBITRUM"),
            ("ethereum", "ETHEREUM"),
        ] {
            if let Ok(v) = std::env::var(format!("{prefix}_RPC_URL")) {
                config = config.merge(Serialized::default(&format!("chains.{chain}.rpc_url"), v));
            }
            if let Ok(v) = std::env::var(format!("{prefix}_BUNDLER_URL")) {
                config = config.merge(Serialized::default(
                    &format!("chains.{chain}.bundler_url"),
                    v,
                ));
            }
            if let Ok(v) = std::env::var(format!("{prefix}_PAYMASTER_URL")) {
                config = config.merge(Serialized::default(
                    &format!("chains.{chain}.paymaster_url"),
                    v,
                ));
            }
        }

        let config: Config = config.extract()?;
        Ok(config)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use figment::Jail;

    // Regression test for two bugs that made Config::load() silently never
    // work via environment variables at all (config.toml-only in practice):
    // 1. Env::prefixed("GHOSTKEY_") (single underscore) vs. the documented
    //    GHOSTKEY__ (double underscore) convention — see comment above.
    // 2. Env::raw().only([...]) produced flat top-level keys that never
    //    matched any nested struct field (auth.jwt_secret, chains.base.*).
    #[test]
    fn load_from_env_vars_only_no_config_toml() {
        Jail::expect_with(|jail| {
            jail.set_env("JWT_SECRET", "test-secret-minimum-32-characters!!");
            jail.set_env("BASE_RPC_URL", "https://sepolia.base.org");
            jail.set_env("BASE_BUNDLER_URL", "https://test.bundler.example");
            jail.set_env("BASE_PAYMASTER_URL", "https://test.paymaster.example");
            jail.set_env("GHOSTKEY__CHAINS__BASE__CHAIN_ID", "84532");
            jail.set_env(
                "GHOSTKEY__CHAINS__BASE__ENTRY_POINT",
                "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
            );
            jail.set_env("GHOSTKEY__SERVER__LOG_FORMAT", "json");

            let config = Config::load().expect("config should load from env vars alone");

            assert_eq!(
                config.auth.jwt_secret,
                "test-secret-minimum-32-characters!!"
            );
            assert_eq!(config.chains.base.rpc_url, "https://sepolia.base.org");
            assert_eq!(
                config.chains.base.bundler_url,
                "https://test.bundler.example"
            );
            assert_eq!(config.chains.base.chain_id, 84532);
            assert_eq!(config.server.log_format, "json");
            // Untouched fields still fall back to their defaults.
            assert_eq!(config.server.host, "0.0.0.0");
            assert_eq!(config.database.url, "sqlite:./db/ghostkey.db");

            Ok(())
        });
    }
}
