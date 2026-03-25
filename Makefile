.PHONY: dev build test test-rust test-sdk lint lint-rust lint-sdk audit coverage migrate clean

# ── Dev ──────────────────────────────────────────────────────────────────────

dev: ## Start full local stack (server + hot reload)
	cargo run --bin ghostkey-server -- --config config.toml

build: ## Build release binary
	cargo build --release
	@echo "Binary: target/release/ghostkey-server"

# ── Tests ────────────────────────────────────────────────────────────────────

test: test-rust test-sdk ## Run all tests

test-rust: ## Run Rust unit + integration tests
	cargo test

test-sdk: ## Run TypeScript SDK tests
	cd sdk && npm test

test-coverage: ## Generate coverage report (Rust + TS)
	cargo tarpaulin --out Html --output-dir coverage/rust -- --test-threads=1
	cd sdk && npm run test:coverage

# ── Lint ─────────────────────────────────────────────────────────────────────

lint: lint-rust lint-sdk ## Lint everything

lint-rust: ## Rust format check + clippy
	cargo fmt --check
	cargo clippy -- -D warnings

lint-sdk: ## TypeScript typecheck + eslint
	cd sdk && npm run typecheck
	cd sdk && npm run lint

fmt: ## Auto-format everything
	cargo fmt
	cd sdk && npm run lint:fix

# ── Security ─────────────────────────────────────────────────────────────────

audit: ## Audit all dependencies for CVEs
	cargo audit
	cd sdk && npm audit --audit-level high

# ── Database ─────────────────────────────────────────────────────────────────

migrate: ## Run database migrations
	cargo run --bin ghostkey-server -- migrate

migrate-dry: ## Preview migrations without running
	sqlx migrate info --database-url sqlite:./ghostkey.db

# ── CI (runs everything) ─────────────────────────────────────────────────────

ci: lint audit test ## Full CI check (lint + audit + test)

# ── Cleanup ──────────────────────────────────────────────────────────────────

clean: ## Clean build artifacts
	cargo clean
	rm -rf sdk/dist sdk/node_modules coverage

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
