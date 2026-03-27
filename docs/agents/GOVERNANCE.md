# GhostKey — System Governance

**Maintained by:** Governor Agent
**Last Verified:** 2026-03-26
**Status:** ACTIVE

This document defines how the GhostKey agent system governs itself.
It is the highest-authority document in the repo after the PRD.
Every agent must defer to it when there is a question about process.

---

## Purpose

The governance system exists to keep the agent corp:
- **Current** — docs reflect reality, not history
- **Consistent** — no agent works from stale context
- **Evolvable** — new roles emerge cleanly, old ones retire without leaving debris
- **Self-aware** — the system can observe and report on its own health

---

## The Living System Contract

Every document in this repo that governs agent behavior makes a promise:
> "What is written here is true right now."

The Governor agent is responsible for enforcing that promise.

When reality diverges from documentation:
1. The divergence is a drift finding.
2. Drift is logged in `HEALTH.md`.
3. The responsible agent is notified.
4. The document is updated or the code is corrected.
5. The resolution is logged in `DECISIONS.md`.

---

## Document Freshness Protocol

Every governance file (`AGENTS.md`, `STACK.md`, all `agents/**/*.md`) carries:

```markdown
**Last Verified:** YYYY-MM-DD
**Verified By:** [Agent Role]
**Trigger:** [What prompted this verification]
```

### Freshness Thresholds

| Doc Type            | Stale After | Action When Stale                      |
|---------------------|-------------|----------------------------------------|
| `STACK.md`          | 14 days     | Governor flags, Architect re-verifies  |
| `AGENTS.md`         | 30 days     | Governor flags, Orchestrator re-verifies|
| Agent role files    | 60 days     | Governor flags, owning agent re-verifies|
| `SECURITY.md`       | 7 days      | Security Lead re-verifies              |
| `HEALTH.md`         | 7 days      | Governor regenerates                   |
| `DECISIONS.md`      | Never stale | Append-only, always current            |

---

## Trigger Map — What Causes What

This table defines when each agent must act. All agents must read this.

| Event                                  | Triggered Agent(s)                            | Required Output                       |
|----------------------------------------|-----------------------------------------------|---------------------------------------|
| New API endpoint added                 | Architect, Docs Agent                         | Update STACK.md, update API docs      |
| API endpoint removed/changed           | Architect, Docs Agent, QA                     | Update STACK.md, docs, remove tests   |
| New Rust dependency added              | Dep Scanner, Architect                        | Run cargo audit, log in DECISIONS.md  |
| New npm dependency added               | Dep Scanner, SDK Engineer                     | Run npm audit, log if crypto-adjacent |
| New chain supported                    | Architect, Backend Eng, Docs Agent            | Update STACK.md, config schema, docs  |
| Phase N completed                      | Orchestrator, Audit Lead, Docs Agent          | Update DECISIONS.md, roadmap.md       |
| Phase N merged to main                 | DevOps Agent, QA Agent                        | Run validation pass per phase; file issues for all gaps |
| All phase validation gaps resolved     | DevOps Agent, Monitor Agent, Docs Agent       | Post-deploy docs branch (CHANGELOG + HEALTH + DEPLOYMENTS), git tag, GitHub release |
| Phase N+1 gate check                   | Orchestrator, Governor                        | Confirm: 0 open issues (except N+1 scope), tag + release published, all docs current |
| Security finding opened                | Security Lead, Audit Lead                     | Log in SECURITY.md, DECISIONS.md      |
| Security finding resolved              | Security Lead, Audit Lead                     | Update SECURITY.md with resolution    |
| Contract code changed                  | Contract Auditor, Security Lead               | Audit required before merge           |
| Non-Goal feature requested             | Compliance Officer, Orchestrator              | Refuse, log in DECISIONS.md           |
| New agent role added                   | Governor, Orchestrator                        | Update AGENTS.md roster, HEALTH.md    |
| Agent role retired                     | Governor, Orchestrator                        | Mark retired in AGENTS.md, archive    |
| Doc found to be stale/wrong            | Governor + owning agent                       | Update doc, log drift in HEALTH.md    |
| Schema change (DB migration)           | Architect, Backend Eng, QA                    | Update STACK.md data model section    |
| Breaking SDK change                    | SDK Eng, Architect, Docs Agent                | Update STACK.md, docs, bump version   |
| CVE found in deps                      | Dep Scanner → Security Lead                   | Log SECURITY.md, block merge if HIGH+ |
| CI fails on dev push                   | Monitor Agent → owning engineer               | Log in DEPLOYMENTS.md, open GH issue  |
| CI green on dev + PR opened to main    | DevOps Agent                                  | Verify CHANGELOG updated, approve PR  |
| Merge to main (deployment)             | Monitor Agent, Docs Agent                     | Record in DEPLOYMENTS.md, watch 15min |
| Post-deploy anomaly detected           | Monitor Agent → DevOps → Architect            | Log DEPLOYMENTS.md, open GH issue     |
| Rollback triggered                     | DevOps Agent → Architect → Orchestrator       | Log DEPLOYMENTS.md + DECISIONS.md     |

---

## Self-Assessment Protocol

The Governor agent runs a weekly self-assessment. It produces a section in `HEALTH.md`.

### Self-Assessment Checklist

```
DOCUMENTS
[ ] All governance docs have Last-Verified within threshold
[ ] STACK.md matches actual codebase structure (if code exists)
[ ] AGENTS.md roster matches actual agents/ directory
[ ] SECURITY.md findings are either active or resolved (none in limbo)
[ ] DECISIONS.md has no decisions marked "Proposed" for > 7 days

AGENT SYSTEM
[ ] No agent role has undefined responsibilities
[ ] No two agents have overlapping responsibilities without a clear boundary
[ ] Every phase in the PRD has an assigned lead agent
[ ] All hard rules in AGENTS.md are enforceable (not aspirational)

CODEBASE (once code exists)
[ ] All public API endpoints are documented in STACK.md
[ ] All documented endpoints exist in code
[ ] All new dependencies have a logged rationale
[ ] Test coverage thresholds are being met
```

---

## Agent Evolution Protocol

### Adding a New Agent

1. Identify the gap (unowned responsibility or overloaded existing agent).
2. Governor proposes new role in `DECISIONS.md` with justification.
3. Orchestrator approves.
4. Create `agents/[division]/[ROLE].md` using the standard template.
5. Governor updates `AGENTS.md` roster table.
6. Governor updates `HEALTH.md`.

### Retiring an Agent

1. Identify why the role is no longer needed.
2. Confirm all responsibilities are transferred to another agent.
3. Mark the agent file header: `**Status:** RETIRED — [DATE] — transferred to [Agent]`
4. Governor updates `AGENTS.md` roster (move to Retired section).
5. Log in `DECISIONS.md`.

### Splitting an Overloaded Agent

1. Identify the responsibility split.
2. Create the new agent file.
3. Edit the original agent file to remove transferred responsibilities.
4. Update `AGENTS.md` and `HEALTH.md`.
5. Log in `DECISIONS.md`.

### Agent Role File Template

```markdown
# Agent: [Role Name]

**Type:** [what kind of work]
**Status:** ACTIVE
**Last Verified:** YYYY-MM-DD
**Verified By:** [agent or human]
**Reports to:** [agent]
**Collaborates with:** [agents]

## Mission
[1-2 sentences. What is this agent for?]

## Responsibilities
[bullet list]

## Constraints
[hard rules this agent must follow]

## Output Format
[what this agent produces and where it goes]
```

---

## Hard Rules

Hard Rules are inviolable. No agent, no automation, no deadline exempts compliance.

| # | Rule | Enforced By |
|---|------|-------------|
| 1 | All Rust code must pass `cargo fmt --check` before commit | pre-commit hook |
| 2 | No merge to main if CI is red | GitHub branch protection |
| 3 | No direct commits to `main` OR `dev` — EVER. All changes go feat/fix branch → dev → main. | Governor + DevOps |
| 4 | Every PR must have a linked GitHub Issue (feat/fix) or be labeled `chore`/`docs` | PR Manager |
| 5 | Coverage must not drop below 80% (Rust) or 80% (SDK) | CI gate |
| 6 | No secrets or private keys in the repo | pre-commit + Dep Scanner |
| 7 | All security-critical changes require Security Lead sign-off | Security Lead |
| 8 | Non-Goals from PRD (`v1prd.md §8`) are hard blockers | Compliance Officer |
| 9 | Phase N+1 cannot start until Phase N issues are resolved and GitHub release is tagged | Orchestrator |
| 10 | All public API changes must update `STACK.md` and `docs/api/endpoints.md` | Architect + Docs Agent |
| 11 | `cargo audit` must pass (or explicitly ignored with documented rationale) on every merge | Dep Scanner |
| 12 | No direct commits to `main` or `dev` — ALL changes go feat/fix/hotfix/docs/chore branch → PR to `dev` → CI green → PR to `main` → CI green → human confirms merge | Governor |
| 13 | Any phase touching intent execution requires a real bundler E2E test (not wiremock-only) before sign-off | QA Agent |

**Rule #12 violation record:**
- 2026-03-26 — hotfix docs committed directly to main during post-demo audit.
- 2026-03-26 — agent system overhaul PR opened against main instead of dev.
Both logged. This has been expressed by the Founder multiple times. Zero exceptions going forward.

---

## Branch Strategy

```
main      ← stable only. Tagged releases. Never committed to directly.
  ▲
  │  PR (dev → main): CI must be GREEN. Human observes and confirms. No assumptions.
  │
dev       ← integration branch. Never committed to directly.
  ▲
  │  PR (feat → dev): CI must be GREEN before merge.
  │
feat/xxx  ← all work happens here
fix/xxx
hotfix/xxx
chore/xxx
docs/xxx
ops/xxx
release/xxx
```

**No exceptions. Hotfixes go through dev too. Always.**

---

## PR Workflow Protocol

All changes — code, docs, hotfixes, agent files — follow this exact flow:

```
# Step 1: Always start from dev
git checkout dev && git pull origin dev

# Step 2: Create your branch
git checkout -b <type>/<short-description>
  type: feat | fix | hotfix | docs | chore | ops | release

# Step 3: Do the work. Commit with conventional message.
git commit -m "[AgentName] type: description"

# Step 4: Push branch
git push -u origin <type>/<short-description>

# Step 5: PR to dev (NOT main)
gh pr create --base dev --head <type>/<short-description> \
  --title "[Agent] type: description" \
  --body "..."

# Step 6: Wait for CI green. Human or auto-merge into dev.

# Step 7: When dev is ready for release, PR dev → main
gh pr create --base main --head dev \
  --title "chore: release vX.X.X" \
  --body "..."

# Step 8: CI must be green. Human observes and confirms. Then merge.
```

**Claude-specific rules:**
- ALWAYS run `git checkout dev && git pull origin dev` before creating any branch
- NEVER use `--base main` on a feature/fix/hotfix/docs/chore branch — always `--base dev`
- NEVER push directly to `dev` or `main`
- Only `dev` itself opens PRs to `main`
- Label every PR with the responsible agent(s): `[Backend]`, `[SDK]`, `[DevOps]`, etc.

---

## Governance Chain

```
FOUNDER (human)
    │
    ▼
GOVERNOR AGENT          ← owns this document, enforces all protocol
    │
    ├── ORCHESTRATOR    ← strategic execution, phase coordination
    │       │
    │       ├── ARCHITECT         ← technical truth, STACK.md ownership
    │       ├── ENGINEERING CORPS ← builds the product
    │       ├── SECURITY DIVISION ← secures the product
    │       ├── AUDIT TEAM        ← logs decisions, enforces compliance
    │       └── OPERATIONS        ← ships and monitors the product
    │
    └── DRIFT DETECTOR  ← runs autonomously, surfaces divergence
```

---

## Conflict Resolution

When two agents disagree:

1. Both agents log their position in `DECISIONS.md` as "Proposed".
2. The higher-authority agent in the chain above makes the call.
3. If unresolved, escalates to Orchestrator, then to Founder.
4. Resolution logged in `DECISIONS.md`.

Authority order for conflict resolution:
`Founder > Governor > Orchestrator > Architect > Security Lead > all others`

Security Lead can veto any decision that violates the non-custodial guarantee or introduces a CRITICAL security risk, regardless of authority order.
