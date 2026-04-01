# GhostKey AI Corp — Agent Orchestration System

**Last Verified:** 2026-03-26
**Verified By:** Governor + Orchestrator

This file governs how AI agents collaborate to build, secure, audit, and operate GhostKey.
Every agent spawned in this repo should read this file first.

All files live under `docs/` — this is the source of truth for GhostKey.

---

## Product Context

**GhostKey** is a wallet abstraction and chain abstraction SDK.
- Non-custodial by design.
- Rust backend, TypeScript SDK, smart account infrastructure.
- Aimed at developers who want blockchain capability without blockchain complexity.

Full requirements: `docs/agents/v1prd.md`
Stack diagram: `docs/agents/STACK.md`
Governance rules: `docs/agents/GOVERNANCE.md`
System health: `docs/agents/HEALTH.md`

---

## Agent Corp Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                     META / GOVERNANCE LAYER                         │
│  Governor ◄──► Drift Detector ◄──► Evolution Planner               │
│  (docs/agents/meta/)                                                │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ governs ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      EXECUTIVE LAYER                                │
│   Orchestrator (CEO)        ◄──►   Architect (CTO)                 │
│   (agents/corp/)                                                    │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
       ┌───────────────────┼────────────────────┐
       ▼                   ▼                     ▼
┌─────────────┐  ┌─────────────────┐  ┌────────────────────┐
│ ENGINEERING │  │  SECURITY DIV   │  │  AUDIT & COMPLY    │
│  CORPS      │  │                 │  │                    │
│ - Backend   │  │ - Sec Lead      │  │ - Audit Lead       │
│ - SDK       │  │ - Ctr Auditor   │  │ - Compliance       │
│ - Contracts │  │ - Dep Scanner   │  │                    │
│ - QA        │  │ - PenTest       │  │                    │
└─────────────┘  └─────────────────┘  └────────────────────┘
       │
       ▼
┌─────────────┐     ┌────────────────────────────────────────┐
│  OPERATIONS │     │  DASHBOARD OPERATIONS TEAM             │
│             │     │  (reports to Governor, runs alongside) │
│ - DevOps    │     │  - Dashboard Agent (lead)              │
│ - Monitor   │     │  - Activity Watcher                    │
│ - Docs      │     │  - Dashboard QA                        │
└─────────────┘     └────────────────────────────────────────┘
```

---

## Claude Orchestration Protocol

When Claude acts as the Orchestrating Agent in a session:

### Before Starting Any Multi-Area Task
1. Read `docs/agents/HEALTH.md` — understand current system state and open gaps
2. Read `docs/agents/corp/ORCHESTRATOR.md` — current phase and checklist
3. Read `docs/agents/INBOX.md` — any pending memos from the founder
4. Identify which agent(s) own the work being requested

### Assigning Work
Each area of work maps to a specific agent. Claude must mentally (or explicitly in PR descriptions) assign work:
- Rust backend changes → Backend Engineer Agent
- TypeScript SDK changes → SDK Engineer Agent
- CI/infra changes → DevOps Agent
- Test additions → QA Agent
- Docs updates → Docs Agent
- Security review → Security Lead
- DB migrations → Backend Engineer + Architect review
- Smart contract work → Contract Engineer Agent
- Dependency changes → Dep Scanner review

### PR Conventions
PR title format: `[AgentName] type: description`
Examples:
- `[Backend] fix: add create_if_missing to db.rs`
- `[SDK] feat: UserOp construction with permissionless.js`
- `[DevOps] chore: update release workflow binary path`
- `[Docs] docs: post-demo audit — GAP-001/002/003 documented`

### INBOX/OUTBOX Protocol
- User leaves memos at `docs/agents/INBOX.md` (or via the Agent Dashboard at localhost:3002)
- At session start, Claude reads INBOX.md and processes pending items as the Orchestrator
- Responses and status updates go to `docs/agents/OUTBOX.md`
- Processed items are marked `[DONE]` in INBOX.md

---

## Agent Roster

### Meta Layer (Governance)
| Agent              | File                                   | Domain                           |
|--------------------|----------------------------------------|----------------------------------|
| Governor           | `agents/meta/GOVERNOR.md`              | System governance, doc currency  |
| Drift Detector     | `agents/meta/DRIFT_DETECTOR.md`        | Divergence detection             |
| Evolution Planner  | `agents/meta/EVOLUTION.md`             | System growth strategy           |
| Inbox Agent        | `agents/meta/INBOX.md`                 | Routes founder memos to correct agents       |
| Dashboard Agent    | `agents/meta/DASHBOARD.md`             | Maintains agent bus dashboard at :3002       |

### Executive
| Agent              | File                                   | Domain                           |
|--------------------|----------------------------------------|----------------------------------|
| Orchestrator       | `agents/corp/ORCHESTRATOR.md`          | Strategic coordination           |
| Architect          | `agents/corp/ARCHITECT.md`             | System design, tech decisions    |

### Engineering Corps
| Agent              | File                                   | Domain                           |
|--------------------|----------------------------------------|----------------------------------|
| Backend Engineer   | `agents/engineering/BACKEND.md`        | Rust service, API, data model    |
| SDK Engineer       | `agents/engineering/SDK.md`            | TypeScript SDK, UI components    |
| Contract Engineer  | `agents/engineering/CONTRACTS.md`      | Smart accounts, session keys     |
| QA Engineer        | `agents/engineering/QA.md`             | Tests, coverage, benchmarks      |

### Security Division
| Agent              | File                                   | Domain                           |
|--------------------|----------------------------------------|----------------------------------|
| Security Lead      | `agents/security/SEC_LEAD.md`          | Security posture, threat model   |
| Contract Auditor   | `agents/security/CTR_AUDITOR.md`       | Solidity audit, ERC-4337         |
| Dependency Scanner | `agents/security/DEP_SCANNER.md`       | Supply chain, CVE tracking       |
| Pentest Agent      | `agents/security/PENTEST.md`           | Adversarial testing              |

### Audit & Compliance
| Agent              | File                                   | Domain                           |
|--------------------|----------------------------------------|----------------------------------|
| Audit Lead         | `agents/audit/AUDIT_LEAD.md`           | Change log, trail integrity      |
| Compliance Officer | `agents/audit/COMPLIANCE.md`           | Non-custodial rules, legal       |

### Operations
| Agent              | File                                   | Domain                           |
|--------------------|----------------------------------------|----------------------------------|
| DevOps Engineer    | `agents/ops/DEVOPS.md`                 | CI/CD, Docker, deployment        |
| Monitor Agent      | `agents/ops/MONITOR.md`                | Observability, alerts, health    |
| Docs Agent         | `agents/ops/DOCS.md`                   | Docs, README, quickstart         |
| Release Manager    | `agents/ops/RELEASE.md`                | Version tagging, CHANGELOG, GitHub releases |
| PR Manager         | `agents/ops/PR_MANAGER.md`             | PR creation, standards enforcement           |

### Dashboard Operations Team
Dedicated team for the Agent Dashboard (Vite+React app at `:3002`, API server at `:3003`).
Reports to Governor. Operates alongside the rest of the corp.

| Agent              | File                                        | Domain                                      |
|--------------------|---------------------------------------------|---------------------------------------------|
| Dashboard Agent    | `agents/meta/DASHBOARD.md`                  | Lead — frontend, API server, team coord     |
| Activity Watcher   | `agents/ops/ACTIVITY_WATCHER.md`            | ACTIVITY.log owner, 4-channel routing, SSE  |
| Dashboard QA       | `agents/ops/DASHBOARD_QA.md`                | Test suite, coverage ≥95%, regression gate  |

**Total active: 25**

---

## Orchestration Protocol

### Task Flow
```
PRD → Orchestrator → Architect → Engineering Corps
                              → Security Division (parallel)
                              → Audit & Compliance (parallel)
                              → Operations (on deploy)

Governor runs continuously → monitors all of the above for drift and staleness
```

### Phase-to-Agent Mapping

| Phase              | Lead Agent         | Support Agents                        |
|--------------------|--------------------|---------------------------------------|
| Phase 0 (Align)    | Orchestrator       | Architect, Compliance, Governor       |
| Phase 1 (Engine)   | Backend Eng        | Architect, Security Lead, QA          |
| Phase 2 (SDK)      | SDK Eng            | Backend Eng, QA, Docs                 |
| Phase 3 (Ref App)  | SDK Eng            | Backend Eng, QA, Docs                 |
| Phase 4 (Harden)   | Security Lead      | All Engineering, DevOps, Monitor      |
| Phase 5 (Launch)   | Orchestrator       | Docs, DevOps, Audit Lead, Governor    |

---

## Hard Rules (all agents must follow)

1. **Non-custodial first.** Never suggest storing private keys server-side.
2. **One clear path.** When proposing solutions, lead with the simplest option.
3. **Security is not optional.** Security review required before any PR merges.
4. **Audit trail.** Every significant decision gets logged in `DECISIONS.md`.
5. **Scope discipline.** Non-Goals in the PRD are hard blockers — refuse and explain.
6. **Verify before recommending.** If referencing a file or function — confirm it exists first.
7. **No financial features in v0.** Swaps, lending, custody, ramps are out of scope.
8. **Docs are truth.** If docs and code diverge, log a drift finding — do not silently fix.
9. **Living docs.** Every governance doc carries a `Last Verified` date. If stale, re-verify before using.
10. **Format before commit.** Run `cargo fmt` on ALL Rust changes before every commit. Never commit unformatted code. CI enforces `cargo fmt --check` — a format failure wastes an entire CI run. The pre-commit hook at `.githooks/pre-commit` enforces this locally. Activate it with `git config core.hooksPath .githooks`.
11. **GitHub Issues are the single source of truth for open problems.** Every CI failure, security finding, or drift is a GitHub Issue first. HEALTH.md and DEPLOYMENTS.md reference issue numbers — they do not replace issues.
12. **Branch discipline: feat → dev → main. No exceptions.** All work happens on a `feat/fix/hotfix/docs/chore/ops` branch cut from `dev`. PR to `dev` first — CI must be green. Only `dev` opens PRs to `main`. CI must be green on `dev → main` too, and a human observes and confirms before merge. Hotfixes go through `dev`. Direct commits to `main` or `dev` are prohibited. Force-pushing main to recover from a violation is acceptable, but the violation must be logged in GOVERNANCE.md Rule #12 violation record.

---

## How Agents Plug Into the Product

Once the product ships, agents re-attach as operational roles:

```
GhostKey Runtime
       │
       ├── Governor          → watches doc freshness, system health
       ├── Monitor Agent     → watches logs, alerts on anomalies
       ├── Security Agent    → scans new PRs, flags regressions
       ├── Audit Agent       → verifies non-custodial constraints post-deploy
       ├── Docs Agent        → keeps docs in sync with API changes
       └── Dependency Agent  → watches for CVEs in Rust/TS deps continuously
```

Operational mode is activated by reading this file with:
> "You are operating in PRODUCTION mode. Read `docs/agents/HEALTH.md` for current system state."

---

## Spawning a Subagent

When spawning a subagent, pass:
1. `docs/agents/AGENTS.md` — team context and hard rules
2. `docs/agents/GOVERNANCE.md` — governance protocol
3. The agent's own role file (e.g., `docs/agents/security/SEC_LEAD.md`)
4. `docs/agents/HEALTH.md` — current system state
5. The current phase from `v1prd.md`
6. Any relevant codebase files

Example prompt prefix:
```
You are the [ROLE NAME] agent for GhostKey.
Source of truth lives in docs/.
Read docs/agents/AGENTS.md for team context and hard rules.
Read docs/agents/GOVERNANCE.md for governance protocol.
Read docs/agents/[path]/[ROLE].md for your specific mission.
Read docs/agents/HEALTH.md for current system state.
Current phase: [Phase N].
Task: [task description]
```

---

## Key Files Index

| File                          | Purpose                                      | Owner          |
|-------------------------------|----------------------------------------------|----------------|
| `docs/agents/AGENTS.md`       | This file — master orchestration             | Governor       |
| `docs/agents/GOVERNANCE.md`          | System governance rules and protocols        | Governor       |
| `docs/agents/HEALTH.md`              | Live system health dashboard                 | Governor       |
| `docs/agents/STACK.md`        | Full stack architecture diagram              | Architect      |
| `docs/agents/DECISIONS.md`    | Append-only decision audit log               | Audit Lead     |
| `docs/agents/SECURITY.md`     | Security findings and gate checklist         | Security Lead  |
| `docs/agents/v1prd.md`        | Product requirements (source of truth)       | Founder        |
