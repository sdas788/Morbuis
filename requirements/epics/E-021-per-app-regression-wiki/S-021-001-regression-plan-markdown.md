# Story: Regression Plan Markdown per Project

**ID:** S-021-001
**Project:** morbius
**Epic:** E-021
**Stage:** Draft
**Status:** Todo (DRIFT)
**Priority:** P4
**Version:** 1.0
**Created:** 2026-04-23
**Updated:** 2026-04-23

---

## ⚠ Drift

This story belongs to E-021 which was explicitly parked ("Anti-Regression Time Machine") and un-parked by user direction on 2026-04-23. Re-confirm before starting work — the decision may have flipped again.

---

## Story

As a QA lead, I want a per-project regression plan stored as markdown so that it's version-controlled, human-readable, and editable in the same way as test cases.

## Acceptance Criteria

**Given** a project exists
**When** the regression plan is first created
**Then** `data/{projectId}/regression-plan.md` is written with frontmatter (schedule, owners, nextRun) and body sections (Overview, Plan Steps, Linked Suites, Approval Chain)

**Given** no plan exists yet
**When** the user opens the Regression tab
**Then** a "Create plan" prompt appears with a starter template

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
