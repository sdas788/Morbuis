# Plan Editor + Top-Nav Tab

**ID:** S-021-002
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

See E-021 drift flag.

---

## Story

As a QA lead, I want to edit the regression plan in a dashboard editor and access it from a top-nav tab so that I don't have to touch raw markdown files.

## Acceptance Criteria

**Given** a regression plan exists
**When** I click the "Regression" tab in the project top-nav
**Then** the plan renders with an "Edit" toggle that switches to markdown editor view

**Given** I save an edit
**When** the save fires
**Then** the markdown file updates and a changelog entry is written

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
