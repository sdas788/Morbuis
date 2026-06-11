# Story: Planned-Flow Fallback for One-Click Run

**ID:** S-028-003
**Project:** morbius
**Epic:** E-028
**Stage:** Ready
**Status:** Done
**Priority:** P1
**Version:** 1.0
**Created:** 2026-06-10
**Updated:** 2026-06-10

---

## Story

As a QA lead, I want a card that maps to a planned-but-uncommitted flow to still run one-click so that automation can be exercised before flow files are committed to the repo.

## Acceptance Criteria

**Given** a card with no direct `maestroFlow` path but a mapping in the automation plan
**When** I press Run
**Then** the server resolves `data/<project>/flows/<flowId>.yaml` from the plan and runs it (no committed machine-specific path required)

**Given** a card with neither a direct flow nor a plan mapping
**When** I press Run
**Then** the API returns a clear error telling me to link a flow or add it to the automation plan

## Implementation Notes (as built)

`resolvePlannedFlowPath` + the `/api/test/run` fallback in `src/server.ts`. The same resolution feeds the per-card "automated" coverage signal (S-029-007).

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-06-10 | 1.0 | Claude | Created — backfilled from shipped code (drift audit). |
