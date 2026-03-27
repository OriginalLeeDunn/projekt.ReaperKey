-- v1.0: Token denylist for immediate JWT invalidation on logout.
-- Stores SHA-256 hashes of revoked tokens; pruned on expiry.
-- Using a hash rather than the full token keeps storage minimal.

CREATE TABLE IF NOT EXISTS token_denylist (
    token_hash TEXT    PRIMARY KEY,   -- SHA-256(raw_token)
    expires_at INTEGER NOT NULL,      -- unix epoch — used to prune stale entries
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_token_denylist_expires ON token_denylist(expires_at);
