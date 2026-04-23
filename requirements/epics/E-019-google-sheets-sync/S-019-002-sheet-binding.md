# Sheet ID Binding per Project

**ID:** S-019-002
**Project:** morbius
**Epic:** E-019
**Stage:** Draft
**Status:** Todo
**Priority:** P2
**Version:** 1.0
**Created:** 2026-04-23
**Updated:** 2026-04-23

---

## Story

As a QA lead, I want to bind a specific Google Sheet to my project so that Morbius knows exactly which sheet is the source of truth for this project's QA plan.

## Acceptance Criteria

**Given** a Google account is connected
**When** I open project Settings → Google Sheets
**Then** I can paste a Sheet URL/ID and a "Validate" button confirms access to that sheet

**Given** the sheet is bound
**When** sync runs
**Then** tabs of the sheet are mapped 1:1 to Morbius categories (same shape as Excel tabs)

**Given** the bound sheet has incompatible structure (missing required columns)
**When** validation runs
**Then** a clear error is shown listing missing columns; sync is not enabled

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
