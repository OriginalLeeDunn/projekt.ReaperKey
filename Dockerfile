# ── Build stage ──────────────────────────────────────────────────────────────
# Floating major-version tag (not a pinned 1.x) so this doesn't go stale the
# same way it just did: a transitive dependency's manifest now requires the
# edition2024 Cargo feature, which 1.82 predates and can't even parse.
FROM rust:1-bookworm AS builder

WORKDIR /build

# Cache dependencies before copying source
COPY Cargo.toml Cargo.lock ./
COPY server/Cargo.toml server/
RUN mkdir -p server/src && echo 'fn main() {}' > server/src/main.rs
RUN cargo build --release --manifest-path server/Cargo.toml 2>/dev/null || true
RUN rm -rf server/src

# Build the real binary
COPY server ./server
RUN cargo build --release --manifest-path server/Cargo.toml

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /build/target/release/ghostkey-server /app/ghostkey-server
COPY server/migrations /app/migrations

# Non-root user. /data is created (and chowned) here, before VOLUME is
# declared and before dropping to a non-root user: Docker copies whatever
# ownership/content already exists at a VOLUME's mount path into the volume
# on first creation, so this is what makes the volume writable by `ghostkey`
# instead of defaulting to root-owned (which SQLITE_CANTOPEN's on first run).
RUN useradd -r -u 1001 -s /bin/false ghostkey \
    && chown -R ghostkey:ghostkey /app \
    && mkdir -p /data \
    && chown ghostkey:ghostkey /data
USER ghostkey

EXPOSE 8080

ENV GHOSTKEY__SERVER__LOG_FORMAT=json
ENV GHOSTKEY__DATABASE__URL=sqlite:///data/ghostkey.db

VOLUME ["/data"]

CMD ["/app/ghostkey-server"]
