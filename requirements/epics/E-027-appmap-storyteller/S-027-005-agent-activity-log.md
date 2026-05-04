# Story: Agent activity log (JSONL)

**ID:** S-027-005
**Project:** morbius
**Epic:** E-027
**Stage:** Ready
**Status:** Done
**Priority:** P2
**Version:** 1.1
**Created:** 2026-05-01
**Updated:** 2026-05-01

---

## Story

As Morbius, I need to log every Claude generation call to a per-project JSONL file, so that "time on task" in the AppMap narrative reflects cumulative agent activity, not just the last generation.

## Acceptance Criteria

**Given** any code path calls `askClaude()`
**When** the call completes (success or error)
**Then** a single JSON line is appended to `data/{projectId}/agent-activity.json` with `{at, kind, durationMs, projectId, ok}`

**Given** the AppMap narrative is generated
**When** computing `timeOnTask.generationMs`
**Then** the helper sums durations from `agent-activity.json` (filtered to kind `appmap-narrative`)

**Given** the activity file exceeds 1000 entries
**When** the next append happens
**Then** entries older than the latest 1000 are moved to `agent-activity-archive.json`

## Constraints

- Foundational story — without it, `timeOnTask.generationMs` reports only the most recent generation. With it, the field actually means "time spent by the agent on this project."
- File path under `MORBIUS_DATA_DIR` (no Fly-specific paths).
- Format JSONL (one JSON object per line) — append-friendly without parsing the whole file.

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-05-01 | 1.0 | Claude | Created |
| 2026-05-01 | 1.1 | Claude | Shipped. New `appendAgentActivity()` + `readAgentActivity()` in `src/server.ts` write JSONL to `data/{projectId}/agent-activity.json` (rotates to `agent-activity-archive.json` past 1000 entries). `askClaude()` settle hook auto-logs every call when caller passes `kind` + `projectId` opts (added two new fields to `AskClaudeOpts`). Wired into `generateAppMapNarrative()` (kind=`appmap-narrative`) and `generateBugImpact()` (kind=`bug-impact`). AppMap narrative `timeOnTask.generationMs` now sums all `appmap-narrative` entries from the log instead of reporting only the latest call duration. **Live verified on micro-air**: post-generate, `agent-activity.json` has 1 entry with `durationMs: 71704`, narrative `generationMs: 71704` matches; structure ready to accumulate on subsequent calls. |
