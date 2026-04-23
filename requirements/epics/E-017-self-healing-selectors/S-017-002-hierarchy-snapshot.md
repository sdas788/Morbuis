# View Hierarchy Snapshot via Maestro MCP

**ID:** S-017-002
**Project:** morbius
**Epic:** E-017
**Stage:** Draft
**Status:** Todo
**Priority:** P0
**Version:** 1.0
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
