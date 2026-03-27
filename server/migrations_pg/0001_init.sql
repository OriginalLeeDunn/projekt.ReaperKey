-- GhostKey initial schema — PostgreSQL
-- Timestamps are BIGINT unix epoch seconds (app always provides the value explicitly).

CREATE TABLE IF NOT EXISTS users (
    id                   TEXT    PRIMARY KEY,  -- UUID string
    auth_method          TEXT    NOT NULL,
    auth_credential_hash TEXT    NOT NULL UNIQUE,
    created_at           BIGINT  NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

CREATE TABLE IF NOT EXISTS accounts (
    id         TEXT    PRIMARY KEY,
    user_id    TEXT    NOT NULL REFERENCES users(id),
    chain      TEXT    NOT NULL,
    address    TEXT    NOT NULL,  -- counterfactual smart account address
    aa_type    TEXT    NOT NULL DEFAULT 'kernel',
    created_at BIGINT  NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
    UNIQUE(user_id, chain)  -- one account per user per chain (SPEC-013)
);

CREATE TABLE IF NOT EXISTS sessions (
    id                TEXT    PRIMARY KEY,
    account_id        TEXT    NOT NULL REFERENCES accounts(id),
    key_hash          TEXT    NOT NULL,  -- client-provided SHA256 of session key
    allowed_targets   TEXT    NOT NULL,  -- JSON array of hex addresses
    allowed_selectors TEXT    NOT NULL,  -- JSON array of 4-byte selectors ("0xabcd1234")
    max_value_wei     TEXT    NOT NULL,  -- wei as decimal string
    expires_at        BIGINT  NOT NULL,  -- unix epoch
    created_at        BIGINT  NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

CREATE TABLE IF NOT EXISTS intents (
    id           TEXT    PRIMARY KEY,
    session_id   TEXT    NOT NULL REFERENCES sessions(id),
    chain        TEXT    NOT NULL,
    target       TEXT    NOT NULL,
    calldata     TEXT    NOT NULL,
    value_wei    TEXT    NOT NULL DEFAULT '0',
    status       TEXT    NOT NULL DEFAULT 'pending',
    tx_hash      TEXT,
    block_number BIGINT,
    created_at   BIGINT  NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
    updated_at   BIGINT  NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

CREATE TABLE IF NOT EXISTS recovery (
    id         TEXT    PRIMARY KEY,
    account_id TEXT    NOT NULL REFERENCES accounts(id),
    method     TEXT    NOT NULL,
    status     TEXT    NOT NULL DEFAULT 'initiated',
    metadata   TEXT    NOT NULL DEFAULT '{}',
    created_at BIGINT  NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id    ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_account_id ON sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_intents_session_id  ON intents(session_id);
CREATE INDEX IF NOT EXISTS idx_intents_status      ON intents(status);
