# Claude-Based Selector Replacement Proposal

**ID:** S-017-003
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

As the healing pipeline, I want Claude to propose a replacement selector given the failed selector and the view hierarchy so that we have a concrete candidate to validate.

## Acceptance Criteria

**Given** a HealingRequest with snapshot
**When** the Claude proposal step runs
**Then** Claude returns: proposed selector, rationale, confidence (0.0–1.0) — stored as a `SelectorProposal` record

**Given** Claude cannot confidently propose a replacement
**When** confidence < 0.5
**Then** the proposal is still stored but marked "low-confidence" and sent to review queue with that flag visible

**Given** Claude's response is malformed
**When** the parser runs
**Then** the proposal is marked "error" and the raw response is stored for debugging

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
