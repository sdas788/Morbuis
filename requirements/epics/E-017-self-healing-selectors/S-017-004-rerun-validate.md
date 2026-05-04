# Story: Re-Run with Proposed Selector + Validate

**ID:** S-017-004
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

As the healing pipeline, I want to validate a proposed selector by running the flow with it in isolation so that only demonstrably-working proposals reach human review.

## Acceptance Criteria

**Given** a SelectorProposal exists
**When** validation runs
**Then** a temporary copy of the flow is created with the proposed selector substituted, and Maestro runs it against the same device

**Given** the validation run passes
**When** complete
**Then** the proposal status becomes "validated" and moves to the review queue

**Given** the validation run fails
**When** complete
**Then** the proposal status becomes "invalidated" and is NOT shown to humans by default (can be surfaced via filter for debugging)

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
| 2026-04-23 | 1.1 | Claude | Implemented: `validateHealingProposal(proposal, projectDir)` reads the original YAML, calls `replaceSelectorOnce()` to swap `failedSelector` → `proposedSelector` (or `modifiedSelector` if the user has edited it), writes the patched YAML to a temp file in `os.tmpdir()`, and runs `maestro test <tmp>` with a 5min timeout. Validation output is persisted as `data/{projectId}/runs/heal-{id}-{ts}.log` so operators can see what happened. Pipeline transitions: `proposed → validating → (passed: 'validated' / failed: 'invalidated')`. The `/api/healing` list defaults to all states; the UI (S-017-005) filters to `validated` by default with a checkbox to reveal `invalidated` for debugging — meeting AC3's "NOT shown by default" requirement. The temp file is unlinked after the run regardless of outcome. AC1 + AC2 + AC3 met. |
