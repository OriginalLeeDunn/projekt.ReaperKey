-- GAP-003: store the on-chain session key address alongside the key hash.
-- The client generates a keypair; key_hash is the SHA-256 of the private key,
-- session_key_address is the corresponding EOA address (checksummed hex).
-- NULL means the session key has not yet been registered on-chain.

ALTER TABLE sessions ADD COLUMN session_key_address TEXT;
