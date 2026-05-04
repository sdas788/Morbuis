# Story: Priority + Rationale Generation via Claude

**ID:** S-018-002
**Project:** morbius
**Epic:** E-018
**Stage:** Draft
**Status:** Todo
**Priority:** P1
**Version:** 1.0
**Created:** 2026-04-23
**Updated:** 2026-04-23

---

## Story

As a QA lead, I want each automation candidate to include a priority (P0/P1/P2) and rationale so that I can trust the ranking without having to reverse-engineer the agent's logic.

## Acceptance Criteria

**Given** the AppMap and existing test cases are provided as context
**When** the candidate-generation agent runs
**Then** it returns a list of `AutomationCandidate` objects with fields: flowName, priority, rationale (1-2 sentences), coverageStatus, expectedValueScore (0.0–1.0)

**Given** existing tests already cover a flow
**When** the agent evaluates
**Then** it correctly marks `coverageStatus: covered` and deprioritizes it (P3 or omit)

**Given** a candidate's rationale is generic (e.g., "This is an important flow")
**When** the output is validated
**Then** a lint check rejects generic rationales and re-prompts for specificity — stored in `data/{projectId}/automation-candidates.md` only when quality threshold passes

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
