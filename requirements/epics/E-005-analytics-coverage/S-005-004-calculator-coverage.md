# Story: Calculator Field Coverage Analysis (STS)

**ID:** S-005-004
**Project:** morbius
**Epic:** E-005
**Stage:** Ready
**Status:** Done
**Priority:** P2
**Version:** 1.0
**Created:** 2026-04-21
**Updated:** 2026-04-21

---

## Story

As a developer, I want Morbius to cross-reference the STS calculator config with existing Maestro flows and test cases to show which fields are covered by automation and which aren't, so the team can prioritise test gaps in complex calculator forms.

## Acceptance Criteria

**Given** a `calculatorConfig.json` exists for the project  
**When** I call `GET /api/coverage`  
**Then** the response includes per-calculator coverage: totalFields, coveredFields (linked to test or flow), uncoveredFields, coverage %

**Given** a calculator field ID appears in a YAML flow comment or test case markdown  
**When** coverage is calculated  
**Then** that field is marked as covered with a reference to the test/flow

**Given** a calculator has 0% coverage  
**When** coverage is displayed  
**Then** it is highlighted as a priority gap

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-21 | 1.0 | PM Agent | Created via reverse-engineer |
