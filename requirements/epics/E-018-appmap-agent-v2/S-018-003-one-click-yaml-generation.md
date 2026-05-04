# Story: One-Click YAML Generation from Candidate

**ID:** S-018-003
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

As a QA lead, I want to click "Generate YAML" on an automation candidate and have Morbius produce a Maestro flow file so that I can move from recommendation to runnable automation in one step.

## Acceptance Criteria

**Given** a candidate with coverageStatus: none or partial
**When** I click "Generate YAML"
**Then** the existing E-006 flow generator is invoked with the candidate's AppMap context and produces a new flow file in the project's Android/iOS flows directory

**Given** generation completes
**When** I return to the candidate list
**Then** the candidate's coverage status updates to "partial" (generated but not run) and a "Run Now" button appears

**Given** generation fails
**When** the failure occurs
**Then** the candidate remains in the list, an error message is shown, and no partial file is left behind

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
