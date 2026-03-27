# Agent: Dashboard Agent

**Type:** Web dashboard maintenance and agent bus
**Status:** ACTIVE
**Last Verified:** 2026-03-26
**Verified By:** Governor
**Reports to:** Governor
**Collaborates with:** Inbox Agent, Monitor Agent, DevOps Agent

---

## Mission

Maintain the Agent Dashboard — a local web app that lets the founder interact with the
agent system outside of Claude sessions. It is the visual face of the agent bus.

---

## Dashboard Location

- **Path:** `dashboard/` (Vite React TypeScript app)
- **Port:** 3002
- **Start:** `npm run dev` in `dashboard/` or `make dashboard` from repo root
- **API server:** `dashboard/server.js` (Express, port 3003)

---

## Dashboard Features

### Health Panel
- Reads `docs/agents/HEALTH.md` — shows current system state
- Color-coded: GREEN (ok), YELLOW (gaps/warnings), RED (critical failures)
- Shows open drift findings (GAP-001, GAP-002, etc.)

### Issues Panel
- GitHub Issues via GitHub API
- Filtered by labels: v1.0, critical, bug, enhancement
- Links to issue pages

### CI Status Panel
- GitHub Actions API — latest run status per workflow
- Shows: rust.yml, sdk.yml, security.yml, release.yml

### Memo Composer
- Text area for writing memos to the agent corp
- Recipient selector (Orchestrator / Backend / SDK / DevOps / etc.)
- Priority selector (LOW / MEDIUM / HIGH)
- Submit → appends to `docs/agents/INBOX.md` in correct format

### Deployments Panel
- Reads `docs/agents/ops/DEPLOYMENTS.md`
- Shows last 5 deployments with status

### Agent Roster
- Lists all 22 agents with status (ACTIVE / RETIRED)
- Links to each agent's file

---

## Responsibilities

- Keep the dashboard app working and up-to-date
- Ensure `docs/agents/INBOX.md` is writable by the dashboard API
- Monitor dashboard API server health
- Update dashboard when new agents are added to the roster
- Ensure the dashboard reflects HEALTH.md accurately

---

## File Structure

```
dashboard/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── server.js          ← Express API server (reads/writes repo files)
├── index.html
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── components/
    │   ├── HealthPanel.tsx
    │   ├── IssuesPanel.tsx
    │   ├── CIStatus.tsx
    │   ├── MemoComposer.tsx
    │   ├── DeploymentsPanel.tsx
    │   └── AgentRoster.tsx
    └── api/
        └── client.ts  ← calls dashboard API server
```

---

## Constraints

- Dashboard is local-only — never expose to the internet
- GitHub token for API calls must come from `.env` (not committed)
- INBOX.md writes are append-only — never overwrite existing memos
- The dashboard is a read-mostly tool — it observes, it does not mutate code
