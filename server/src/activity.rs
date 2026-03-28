/// Activity log — appends structured JSON lines to docs/agents/ACTIVITY.log.
///
/// The dashboard at localhost:3002 reads this file via SSE and shows a live
/// feed of all system events: auth, intents, session keys, accounts, recovery.
///
/// Design rules (per Monitor Agent):
/// - Never log private keys, session key material, or raw calldata.
/// - User IDs are internal UUIDs only — no email or PII.
/// - IP addresses must be hashed before logging.
/// - All methods are fire-and-forget: IO errors are silently swallowed so
///   the Rust server always continues normally even if the dashboard is down.
use std::{fs::OpenOptions, io::Write, path::PathBuf, sync::Mutex};

use serde::Serialize;

/// A single activity log entry. All fields beyond the core five are optional
/// so that existing Claude Code PostToolUse entries remain parseable.
#[derive(Debug, Serialize)]
pub struct ActivityEntry {
    pub ts: String,
    /// Source tier: "backend" | "agent" | "claude" | "ci"
    pub event_type: &'static str,
    /// Human-readable agent name shown in the dashboard.
    pub agent: &'static str,
    /// Machine-readable dot-separated verb: "auth.login.success"
    pub action: String,
    /// Human-readable description.
    pub detail: String,
    /// "ok" | "warn" | "error"
    pub status: &'static str,
    /// Internal user UUID — never email/phone.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_id: Option<String>,
    /// Chain name: "base", "arbitrum", "ethereum"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub chain: Option<String>,
    /// Event-specific structured fields. Must not contain keys/calldata/PII.
    #[serde(skip_serializing_if = "serde_json::Value::is_null")]
    pub meta: serde_json::Value,
}

impl ActivityEntry {
    pub fn backend(
        action: impl Into<String>,
        detail: impl Into<String>,
        status: &'static str,
    ) -> Self {
        Self {
            ts: chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
            event_type: "backend",
            agent: "Backend",
            action: action.into(),
            detail: detail.into(),
            status,
            user_id: None,
            chain: None,
            meta: serde_json::Value::Null,
        }
    }

    pub fn with_user(mut self, id: impl ToString) -> Self {
        self.user_id = Some(id.to_string());
        self
    }

    pub fn with_chain(mut self, chain: impl Into<String>) -> Self {
        self.chain = Some(chain.into());
        self
    }

    pub fn with_meta(mut self, meta: serde_json::Value) -> Self {
        self.meta = meta;
        self
    }
}

/// Appends activity entries to ACTIVITY.log. Thread-safe via Mutex.
/// Path is resolved relative to the repo root (parent of the server/ directory).
pub struct ActivityLogger {
    path: PathBuf,
    lock: Mutex<()>,
}

impl ActivityLogger {
    /// Creates a new logger. `log_path` should be an absolute path to ACTIVITY.log.
    pub fn new(log_path: PathBuf) -> Self {
        Self {
            path: log_path,
            lock: Mutex::new(()),
        }
    }

    /// Resolves the default path relative to the binary's working directory.
    /// When the server runs from `server/` dir: `../docs/agents/ACTIVITY.log`.
    /// When it runs from repo root: `docs/agents/ACTIVITY.log`.
    pub fn default_path() -> PathBuf {
        // Try repo-root-relative first, then fall back to server/-relative.
        let candidates = [
            PathBuf::from("docs/agents/ACTIVITY.log"),
            PathBuf::from("../docs/agents/ACTIVITY.log"),
        ];
        for p in &candidates {
            if let Some(parent) = p.parent() {
                if parent.exists() {
                    return p.clone();
                }
            }
        }
        // Fall back silently — emit() will just fail and return.
        PathBuf::from("docs/agents/ACTIVITY.log")
    }

    /// Fire-and-forget: serialise entry to JSON and append to log file.
    /// Never panics. Never blocks the caller (write is under mutex but
    /// the file write is fast enough that contention is negligible).
    pub fn emit(&self, entry: ActivityEntry) {
        let Ok(line) = serde_json::to_string(&entry) else {
            return;
        };
        // Swallow mutex poison — we don't want the server to crash.
        let _guard = self.lock.lock().unwrap_or_else(|e| e.into_inner());
        if let Ok(mut f) = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.path)
        {
            let _ = writeln!(f, "{line}");
        }
    }
}
