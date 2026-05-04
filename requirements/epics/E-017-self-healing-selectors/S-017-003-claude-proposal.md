# Story: Claude-Based Selector Replacement Proposal

**ID:** S-017-003
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
| 2026-04-23 | 1.1 | Claude | Implemented: `buildHealingPrompt(proposal, hierarchy)` produces strict-JSON instructions ("ONLY a single JSON object, no fences") with the failed selector + truncated hierarchy as context. The pipeline's proposal step calls the shared `askClaude()` helper (E-016 foundation) → `extractJson()` → coerces to `{proposedSelector, confidence (0..1 clamped), rationale}` and writes back to the same `proposal-{id}.md`. AC2: low-confidence (<0.5) is preserved by `confidence` field on the proposal — the UI in S-017-005 reads it and adds the "low-confidence" badge. AC3: parse failure → `state: 'error'` + `rawClaudeResponse` field is preserved in the markdown body's "## Raw Claude Response (parse failed)" section so operators can debug. AC1 met. |
