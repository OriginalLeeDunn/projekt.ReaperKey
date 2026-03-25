use dashmap::DashMap;
use std::collections::VecDeque;
use std::time::{Duration, Instant};

/// Sliding-window in-memory rate limiter.
/// Keyed by arbitrary string (e.g. "login:{ip}").
pub struct RateLimiter {
    requests: DashMap<String, VecDeque<Instant>>,
    limit: u32,
    window: Duration,
}

impl RateLimiter {
    pub fn new(limit: u32, window_secs: u64) -> Self {
        Self {
            requests: DashMap::new(),
            limit,
            window: Duration::from_secs(window_secs),
        }
    }

    /// Returns `true` if the request is allowed, `false` if rate limited.
    pub fn check(&self, key: &str) -> bool {
        let now = Instant::now();
        let mut deque = self.requests.entry(key.to_string()).or_default();
        // Remove entries outside the window
        while let Some(&front) = deque.front() {
            if now.duration_since(front) > self.window {
                deque.pop_front();
            } else {
                break;
            }
        }
        if deque.len() as u32 >= self.limit {
            return false;
        }
        deque.push_back(now);
        true
    }
}
