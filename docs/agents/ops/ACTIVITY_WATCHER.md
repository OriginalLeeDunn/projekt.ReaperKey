# Agent: Activity Watcher

**Type:** Activity pipeline owner — log integrity, channel routing, SSE health
**Status:** ACTIVE
**Last Verified:** 2026-03-28
**Verified By:** Governor
**Reports to:** Dashboard Agent
**Collaborates with:** Dashboard Agent, Dashboard QA, Governor, Monitor Agent

---

## Mission

Own `docs/agents/ACTIVITY.log` — the single source of truth for all agent activity visible
in the dashboard Activity tab. Ensure every agent action, CI run, backend event, and Claude
tool use lands in the log with the correct `event_type`. Keep the SSE feed healthy. Backfill
missing entries when gaps are discovered.

---

## The Four Activity Channels

| Channel | `event_type` | Written by | Trigger |
|---------|-------------|------------|---------|
| Claude tool use | `"claude"` | `.claude/settings.local.json` PostToolUse hook | Every Claude tool call |
| Agent doc events | `"agent"` | `server.js` doc watchers (fs.watch) | INBOX/OUTBOX/DECISIONS/HEALTH change |
| GitHub CI runs | `"ci"` | `server.js` CI poller (every 5 min) | Completed GitHub Actions workflow run |
| Backend API | `"backend"` | `POST /api/activity` from backend | Backend service events |

**Rule: every channel MUST write to ACTIVITY.log. If a channel is silent for >24 h during
active development, investigate and backfill.**

---

## ACTIVITY.log Format

Every line is a newline-delimited JSON object:

```json
{
  "ts":         "<ISO 8601 timestamp>",
  "event_type": "claude|agent|ci|backend",
  "agent":      "<agent name or service>",
  "action":     "<verb phrase>",
  "detail":     "<human-readable context>",
  "status":     "ok|error|warn",
  "meta":       { }
}
```

### Required fields: `ts`, `event_type`, `agent`, `action`, `status`
### Optional: `detail`, `meta`, `chain` (backend only)

---

## Channel Protocols

### Claude Channel (event_type: "claude")
Managed by `PostToolUse` hook in `.claude/settings.local.json`:
```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "",
      "hooks": [{ "type": "command", "command": "..." }]
    }]
  }
}
```
- Written after EVERY Claude tool call (Read, Edit, Write, Bash, etc.)
- `agent` = `"Claude"`, `action` = tool name (e.g. `"Read"`, `"Edit"`)
- If hook is missing or broken: Activity tab will show no `claude` entries → diagnose immediately

### Agent Channel (event_type: "agent")
Managed by `server.js` doc watchers (`fs.watch`):
- **INBOX.md** → `action: "memo received"` when new MEMO block detected
- **OUTBOX.md** → `action: "memo sent"` when heading changes
- **DECISIONS.md** → `action: "decision recorded"` when new `## ` heading detected
- **HEALTH.md** → `action: "health update"` with `status` derived from OVERALL line

All active agents MUST log their own session boundaries:
```json
{"ts": "...", "event_type": "agent", "agent": "<AgentName>", "action": "<AgentName> run start", "detail": "<trigger>", "status": "ok"}
{"ts": "...", "event_type": "agent", "agent": "<AgentName>", "action": "<AgentName> run end", "detail": "<summary>", "status": "ok"}
```

### CI Channel (event_type: "ci")
Managed by `server.js` CI poller (`pollCIRuns()`, 5-minute interval):
- Polls `GET /repos/{owner}/{repo}/actions/runs?per_page=20`
- Requires `GITHUB_TOKEN` in environment
- Deduplication via `seenRunIds` Set (seeded from existing log on startup)
- Entry format: `action: "workflow_run"`, `detail: "CI #{id} {branch} — {conclusion}"`
- `status: "ok"` for success, `"error"` for failure
- If CI poller is broken: Activity tab shows no `ci` entries → check `GITHUB_TOKEN`

### Backend Channel (event_type: "backend")
Managed by `POST /api/activity` endpoint:
```json
POST /api/activity
{ "agent": "...", "action": "...", "detail": "...", "status": "ok", "event_type": "backend" }
```
- Backend services call this endpoint to log deployment events, health changes, migrations
- Dashboard server validates `event_type` is one of the four valid values
- `meta.chain` can be included for on-chain events

---

## Audit Protocol

Run at the start of every governor session and whenever the Activity tab looks stale:

1. **Check all 4 channels are present** in the last 24h of ACTIVITY.log
2. **Verify hook is wired**: inspect `.claude/settings.local.json` for PostToolUse entry
3. **Verify doc watchers**: server.js must call `fs.watch` on the 4 watched files (guarded by `NODE_ENV !== 'test'`)
4. **Verify CI poller**: check that `pollCIRuns` is called and `GITHUB_TOKEN` is set
5. **Backfill** any missing governor/agent session entries using the actual session timestamps from git log

### Backfill Entry Template
```bash
# Append a backfill entry to ACTIVITY.log
echo '{"ts":"<ISO8601>","event_type":"agent","agent":"<Name>","action":"<action>","detail":"<context> [backfilled]","status":"ok"}' >> docs/agents/ACTIVITY.log
```

---

## SSE Feed Health

The dashboard Activity tab receives real-time updates via Server-Sent Events on `/api/activity/stream`.

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Feed shows "Connecting..." indefinitely | server.js not running | `node dashboard/server.js` |
| Feed connected but no new events | No writes to ACTIVITY.log | Check all 4 channels |
| Feed shows stale data after restart | seenRunIds not seeded | Should auto-seed on startup |
| CI entries missing | `GITHUB_TOKEN` not set | Add to `.env.local` |

---

## Responsibilities

- Audit ACTIVITY.log completeness at the start of every session.
- Backfill missing entries whenever a gap is discovered.
- Maintain the PostToolUse hook in `.claude/settings.local.json`.
- Document any new activity channels here and in server.js.
- Ensure all agents know they must log session start/end entries.
- Review dashboard Activity tab weekly — verify all 4 channel types appear.
- Escalate to Dashboard Agent if SSE feed is broken.

---

## Activity Log Protocol

```json
{"ts": "<ISO8601>", "event_type": "agent", "agent": "Activity Watcher", "action": "Activity Watcher run start", "detail": "<audit trigger>", "status": "ok"}
{"ts": "<ISO8601>", "event_type": "agent", "agent": "Activity Watcher", "action": "channel audit", "detail": "checked 4 channels — <findings>", "status": "ok|warn"}
{"ts": "<ISO8601>", "event_type": "agent", "agent": "Activity Watcher", "action": "backfill", "detail": "added <N> missing entries for <agent>", "status": "ok"}
{"ts": "<ISO8601>", "event_type": "agent", "agent": "Activity Watcher", "action": "Activity Watcher run end", "detail": "audit complete", "status": "ok"}
```
