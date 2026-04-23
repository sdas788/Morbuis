# Related-Tests-to-Rerun Rationale + Risk Score

**ID:** S-016-005
**Project:** morbius
**Epic:** E-016
**Stage:** Draft
**Status:** Todo
**Priority:** P1
**Version:** 1.0
**Created:** 2026-04-23
**Updated:** 2026-04-23

---

## Story

As a QA lead, I want each related test to include a rationale explaining *why* it should be rerun, and a regression risk score for the whole bug, so that I can triage smarter — not just chase a list.

## Acceptance Criteria

**Given** an impact analysis is generated
**When** it lists related tests
**Then** each test entry includes a one-line rationale (e.g., "shares the Login screen," "upstream dependency via user state")

**Given** the impact analysis has a risk score
**When** rendered
**Then** the score (0.0–1.0) is displayed with a color-coded band (green <0.3, yellow 0.3–0.7, red >0.7) and a prose summary

**Given** a QA lead disagrees with a rationale
**When** they flag it as "not relevant"
**Then** the flag is stored and can inform a future feedback loop (not required to change the LLM yet — just capture)

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
