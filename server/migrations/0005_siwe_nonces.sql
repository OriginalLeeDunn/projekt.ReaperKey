-- SIWE (Sign-In with Ethereum, EIP-4361) nonces.
-- Single-use: consumed via DELETE on verification, not a `used` flag —
-- avoids a read-then-write race between checking and marking a nonce spent.

CREATE TABLE IF NOT EXISTS siwe_nonces (
    nonce      TEXT    PRIMARY KEY,
    expires_at INTEGER NOT NULL,      -- unix epoch — nonces are short-lived (5 min)
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_siwe_nonces_expires ON siwe_nonces(expires_at);
