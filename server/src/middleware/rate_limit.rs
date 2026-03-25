use dashmap::DashMap;
use std::time::{Duration, Instant};

/// Simple in-memory sliding-window rate limiter.
/// Keyed by arbitrary string (e.g. "login:{ip}").
pub struct RateLimiter {
    state: DashMap<String, (u32, Instant)>,
    max_requests: u32,
    window: Duration,
}

impl RateLimiter {
    pub fn new(max_requests: u32, window_secs: u64) -> Self {
        Self {
            state: DashMap::new(),
            max_requests,
            window: Duration::from_secs(window_secs),
        }
    }

    /// Returns `true` if the request is allowed, `false` if rate limited.
    pub fn check(&self, key: &str) -> bool {
        let now = Instant::now();
        let mut entry = self.state.entry(key.to_string()).or_insert((0, now));

        if now.duration_since(entry.1) > self.window {
            *entry = (1, now);
            return true;
        }

        if entry.0 >= self.max_requests {
            return false;
        }

        entry.0 += 1;
        true
    }
}
