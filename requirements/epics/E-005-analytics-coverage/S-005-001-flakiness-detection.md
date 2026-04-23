# Flakiness Detection + Transition-Based Scoring

**ID:** S-005-001
**Project:** morbius
**Epic:** E-005
**Stage:** Ready
**Status:** Done
**Priority:** P1
**Version:** 1.0
**Created:** 2026-04-21
**Updated:** 2026-04-21

---

## Story

As a QA lead, I want flaky tests automatically identified and ranked by flakiness score, so the team knows which tests need stabilisation before they waste time chasing intermittent failures.

## Acceptance Criteria

**Given** a test has a run history with alternating pass/fail results  
**When** the flakiness score is calculated  
**Then** score = transitions / (window - 1); a perfectly alternating P-F-P-F scores 1.0; always-passing scores 0.0

**Given** a test scores ≥0.4 over the last 10 runs  
**When** the Dashboard loads  
**Then** that test appears in the Flaky Tests section, ranked by score descending

**Given** fewer than 2 runs exist for a test  
**When** flakiness is calculated  
**Then** the test is excluded from the flaky list (insufficient data)

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-21 | 1.0 | PM Agent | Created via reverse-engineer |
