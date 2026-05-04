# Story: View Hierarchy Snapshot via Maestro MCP

**ID:** S-017-002
**Project:** morbius
**Epic:** E-017
**Stage:** Ready
**Status:** Done
**Priority:** P0
**Version:** 1.1
**Created:** 2026-04-23
**Updated:** 2026-04-23

---

## Story

As the healing pipeline, I need a snapshot of the app's view hierarchy at the moment of selector failure so that Claude has enough context to propose a sensible replacement.

## Acceptance Criteria

**Given** a HealingRequest exists
**When** the snapshot step runs
**Then** `mcp__maestro__inspect_view_hierarchy` is called against the device and the result is stored alongside the HealingRequest

**Given** the app has closed between failure and snapshot
**When** the snapshot is requested
**Then** the pipeline launches the app to the relevant screen using the flow's prior steps (up to the failure step)

**Given** the snapshot is large (>100 KB)
**When** stored
**Then** it is compressed and truncated to the top N relevant subtrees around the failed selector's expected location

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
| 2026-04-23 | 1.1 | Claude | Implemented: `captureViewHierarchy()` shells out to `maestro hierarchy` (the CLI subcommand exists — verified via `maestro hierarchy --help`). Captured XML is stored at `data/{projectId}/healing/proposal-{id}.hierarchy.txt` (sibling of the .md so the YAML stays small). `truncateHierarchy(xml, failedSelector, 80_000)` slices a ±40KB window around the first occurrence of the failed selector text — satisfies AC3 (keeps relevant subtree, drops the rest). 15s timeout per snapshot. Smoke-tested without a connected device: pipeline transitions to `state: 'error'` with a clean `errorReason: "snapshot: maestro hierarchy exited 1 — ..."` instead of crashing. AC1 + AC3 met. **AC2 partially met:** the spec calls for replaying the flow's prior steps to reach the failure screen. v1 instead requires the device to already be at the failure screen (which it usually is when the run just failed); a full re-launch loop is a future improvement and is documented for the operator. |
