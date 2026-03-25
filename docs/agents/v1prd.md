# GhostKey PRD + Execution Plan

## 1. Product Summary

GhostKey is a Web3 wallet abstraction and chain abstraction layer that lets applications give users normal login experiences while handling smart accounts, signatures, gas, and chain routing under the hood.

It is designed to make Web3 feel invisible to users and simple for developers.

## 2. Vision

Make blockchain usable in normal apps without requiring users to understand wallets, seed phrases, gas, chains, or transaction plumbing.

## 3. Problem Statement

Web3 adoption is blocked by:
- Poor wallet UX.
- Friction from seed phrases and browser extensions.
- Chain switching confusion.
- Complex developer integration.
- Fragmented account abstraction and gas handling.

Developers want on-chain capabilities without building wallet infrastructure themselves.

## 4. Target Users

### Primary
- Web app developers.
- Game developers.
- Indie builders.
- SaaS teams adding on-chain features.

### Secondary
- Technical founders.
- Open-source contributors.
- Future enterprise customers needing self-hosted infra.

## 5. Product Definition

GhostKey provides:
- Smart account creation.
- Session key management.
- Chain abstraction.
- Gas abstraction.
- Intent-based transaction execution.
- Simple SDKs for frontend and backend integration.
- Optional hosted service for teams that do not want to self-host.

## 6. Product Layer

GhostKey sits at the:
- Wallet abstraction layer.
- Account abstraction layer.
- Chain routing layer.
- Developer experience layer.

It is not:
- A token project.
- A DEX.
- A custody platform.
- A trading platform.

## 7. Core User Outcomes

### For developers
- Add login and on-chain actions with minimal code.
- Avoid building wallet UX from scratch.
- Support multiple chains through one interface.
- Ship faster with less crypto-specific complexity.

### For end users
- Sign up with familiar methods.
- Interact with blockchain features without knowing the underlying mechanics.
- Recover access in a guided way.
- Avoid constant wallet popups and chain confusion.

## 8. Non-Goals

GhostKey v0 will not include:
- Token issuance.
- Swaps.
- Lending.
- Custody of user funds.
- Fiat on/off ramps.
- Advanced portfolio analytics.
- DAO governance tooling.
- NFT marketplace features.

## 9. Legal and Risk Posture

GhostKey v0 should remain:
- Non-custodial.
- Infrastructure-oriented.
- Software-only.
- Clear about user-authorized actions.

The product should avoid:
- Holding private keys on behalf of users.
- Touching customer funds directly.
- Acting as an exchange.
- Acting as a broker.
- Acting as a payment processor unless explicitly planned later.

## 10. MVP Scope

### v0 must do
1. User login.
2. Smart account creation.
3. Session key issuance.
4. Simple intent execution.
5. Chain selection for a small set of supported chains.
6. Clear developer SDK.
7. Basic recovery flow.
8. Self-hostable backend.

### v0 should not do
- Complex DeFi actions.
- Multi-chain orchestration across many ecosystems.
- Heavy compliance workflows.
- Enterprise admin panels.
- Full mobile native SDKs.

## 11. Technical Architecture

### Backend
- Rust service.
- Single binary deployment.
- SQLite for state.
- Config-driven chain support.
- RPC integration for supported chains.
- Session and account management.

### Frontend SDK
- TypeScript SDK.
- Optional WASM support.
- Developer-friendly hooks and helpers.
- Simple UI components for login and confirmation flows.

### Data Model
- Users.
- Accounts.
- Sessions.
- Intent logs.
- Chain configuration.
- Recovery metadata.

### External Dependencies
- RPC providers.
- Smart account infrastructure.
- Optional relayer/paymaster integrations.

## 12. Security Principles

- Non-custodial by default.
- Keep key material client-side where possible.
- Minimize stored sensitive data.
- Use short-lived session credentials.
- Log actions safely.
- Rate limit sensitive endpoints.
- Make failure states explicit.

## 13. Product Principles

- Simple over clever.
- One clear path for users.
- One simple API for developers.
- Self-hostable first.
- Open-source friendly.
- Minimal dependencies.
- Clear boundaries between software and financial functionality.

## 14. Success Metrics

### Developer metrics
- Time to first integration.
- Number of SDK installs.
- Number of apps using the reference implementation.
- Conversion from repo visit to successful local setup.

### Product metrics
- Successful logins.
- Successful intent executions.
- Session reuse rate.
- Recovery success rate.
- Chain routing success rate.

### Business metrics
- Hosted deployments.
- Active teams.
- Paid conversions.
- Support requests per deployment.

## 15. Execution Plan

### Phase 0: Alignment
- Define exact product boundaries.
- Finalize non-custodial constraints.
- Select initial chain support.
- Confirm legal posture.
- Draft repo structure.

### Phase 1: Core Engine
- Build Rust backend skeleton.
- Add user/session model.
- Add smart account abstraction hooks.
- Add intent execution pipeline.
- Add minimal configuration system.

### Phase 2: SDK
- Build TypeScript client.
- Add login flow.
- Add account fetch flow.
- Add send-intent flow.
- Add example app integration.

### Phase 3: Reference App
- Build a simple demo app.
- Implement login and on-chain action flows.
- Show recovery and session renewal.
- Use the product exactly how a real customer would.

### Phase 4: Hardening
- Add rate limiting.
- Add structured logging.
- Add better error handling.
- Add testing.
- Add deployment docs.

### Phase 5: Open Source Launch
- Publish docs.
- Publish README.
- Publish security model.
- Publish quickstart.
- Publish roadmap.
- Invite contributors.

## 16. MVP Acceptance Criteria

GhostKey v0 is done when:
- A developer can run the backend locally.
- A developer can integrate the SDK in under 30 minutes.
- A user can sign in and create an account.
- A user can execute at least one on-chain action.
- Session handling works reliably.
- The system remains non-custodial.
- The demo app works end to end.

## 17. Risks

- Legal ambiguity around crypto infrastructure.
- Over-scoping into exchange-like behavior.
- Poor wallet UX if recovery is weak.
- RPC dependency failures.
- Security issues if key handling is not carefully designed.
- Too many supported chains too early.

## 18. Mitigations

- Stay non-custodial.
- Keep v0 narrow.
- Use standard, proven crypto libraries.
- Support only 1–2 chains initially.
- Use clear docs and explicit boundaries.
- Avoid financial features in v0.
- Get legal review before custody or trading features.

## 19. Founder Intent

GhostKey is not just a crypto project.

It is a developer infrastructure project that happens to live in Web3.
Its purpose is to remove friction, simplify onboarding, and let normal apps use blockchain without becoming blockchain products.

## 20. Immediate Next Steps

1. Lock scope.
2. Define non-custodial rules.
3. Choose initial chain.
4. Draft API endpoints.
5. Draft SDK interface.
6. Build repo skeleton.
7. Create demo app.
8. Publish first open-source milestone.