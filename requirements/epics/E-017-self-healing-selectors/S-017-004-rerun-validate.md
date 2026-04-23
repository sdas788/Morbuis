# Re-Run with Proposed Selector + Validate

**ID:** S-017-004
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
