# ── Build stage ──────────────────────────────────────────────────────────────
FROM rust:1.82-bookworm AS builder

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

# Non-root user
RUN useradd -r -u 1001 -s /bin/false ghostkey && chown -R ghostkey:ghostkey /app
USER ghostkey

EXPOSE 8080

ENV GHOSTKEY__SERVER__LOG_FORMAT=json
ENV GHOSTKEY__DATABASE__URL=sqlite:///data/ghostkey.db

VOLUME ["/data"]

CMD ["/app/ghostkey-server"]
