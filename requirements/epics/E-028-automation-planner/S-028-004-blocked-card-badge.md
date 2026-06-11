# Story: Blocked-Card Badge from Plan Blockers

**ID:** S-028-004
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

As a QA tester, I want a card that is blocked in the automation plan to show that visibly with a reason so that I don't waste time trying to run something that can't pass yet.

## Acceptance Criteria

**Given** a card flagged blocked in the automation plan
**When** I view it on the board or in the drawer
**Then** it shows a ⛔ badge and the blocked reason (falling back to "see Automation Plan" / "Blocked in automation plan" when no reason is given)

**Given** a blocked card
**When** the dashboard computes coverage
**Then** the block is reflected honestly rather than counted as runnable

## Implementation Notes (as built)

`blockedMap` built in `loadMorbiusData`; ⛔ badge rendered in the test drawer/card in `src/server.ts`.

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-06-10 | 1.0 | Claude | Created — backfilled from shipped code (drift audit). |
