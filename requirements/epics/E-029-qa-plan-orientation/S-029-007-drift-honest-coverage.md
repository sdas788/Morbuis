# Story: Source Drift Detection + Honest Coverage

**ID:** S-029-007
**Project:** morbius
**Epic:** E-029
**Stage:** Ready
**Status:** Done
**Priority:** P1
**Version:** 1.0
**Created:** 2026-06-10
**Updated:** 2026-06-10

---

## Story

As a QA lead, I want to know when an imported card has drifted from its PMAgent source and I want coverage reported truthfully so that the board can be trusted instead of silently misrepresenting state.

## Acceptance Criteria

**Given** an imported card carrying `pmagent_source { sourcePath, sourceChecksum }`
**When** I open its detail
**Then** the live source checksum is recomputed and the card is badged In sync / Drifted / Source missing / Pinned (checksum is over the AC text, so title changes don't trip it)

**Given** the dashboard coverage cell
**When** it computes automation coverage
**Then** it shows true per-card coverage (cards with a runnable flow ÷ total) — a card counts as automated only with a direct `maestroFlow` OR a written automation-plan flow — not a flow-count proxy

## Implementation Notes (as built)

`recomputeSourceChecksum` in `src/parsers/pmagent.ts`; drift badge in `/api/test/:id` + `TestPlanDetail`; honest coverage on the Dashboard, all in `src/server.ts`. `morbius doctor` reports source-drift status (verified: 203 cards in sync).

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-06-10 | 1.0 | Claude | Created — backfilled from shipped code (drift audit). |
