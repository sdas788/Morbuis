# Story: Per-flow rationale + run insights

**ID:** S-027-003
**Project:** morbius
**Epic:** E-027
**Stage:** Ready
**Status:** Done
**Priority:** P1
**Version:** 1.1
**Created:** 2026-05-01
**Updated:** 2026-05-01

---

## Story

As a QA Lead reading the AppMap tab, I want each automated flow to surface *why this specific flow was picked* and *what the runs reveal*, so the team can grok the automation set without me explaining it.

## Acceptance Criteria

**Given** the generation prompt is extended (S-027-002 already covers this story's prompt edits)
**When** Claude returns the structured response
**Then** `perFlow[]` has one entry per flow currently visible on the Maestro tab, each with `{flowId, whyPicked, lastRunsSummary, agentTimeMs}`

**Given** a flow with run history
**When** rendered
**Then** `lastRunsSummary` mentions at least one concrete observation (specific failing step, retry pattern, device, or pass-rate trend) — not boilerplate

**Given** a flow with zero runs
**When** rendered
**Then** `lastRunsSummary` says "No runs yet" verbatim (so the UI can render an explicit empty state)

## Constraints

- Per-flow data lives inside `appmap-narrative.md` as part of the same single-file fetch (no separate endpoint, no separate file).
- `agentTimeMs` is computed server-side: sum of last-3 runs' `durationMs` for that flow + a proportional slice of `modelDurationMs`.

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-05-01 | 1.0 | Claude | Created |
| 2026-05-01 | 1.1 | Claude | Shipped alongside S-027-002 (folded into the same prompt + context pipeline). `buildAppMapNarrativeContext()` builds `flowToTestIds` map by joining flow basenames with `TestCase.maestroFlow{,Android,Ios}` and `qaPlanId`. `flowDurationMs` per flow = sum of last 3 matching runs' `durationMs` from `loadAllRuns()`. Server-side fills empty `lastRunsSummary` with literal `"No runs yet"` when no run history. Live verified on micro-air: 15 perFlow entries, every `whyPicked` cites the specific flow's screen+linked test IDs, `lastRunsSummary === "No runs yet"` correctly applied (no runs in this project yet). |
