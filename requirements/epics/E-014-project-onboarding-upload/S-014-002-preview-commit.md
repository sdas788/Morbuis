# Post-Upload Preview + Commit Flow

**ID:** S-014-002
**Project:** morbius
**Epic:** E-014
**Stage:** Draft
**Status:** Todo
**Priority:** P0
**Version:** 1.0
**Created:** 2026-04-23
**Updated:** 2026-04-23

---

## Story

As a QA lead, I want to preview the parsed test cases before committing the import so that I can catch malformed sheets or unexpected categories before they pollute my project.

## Acceptance Criteria

**Given** an Excel file has been uploaded
**When** parsing completes
**Then** a preview shows: detected categories, total test cases per category, and a sample of 5 test rows

**Given** the preview looks correct
**When** I click "Commit Import"
**Then** the project + test cases are persisted and the modal closes

**Given** the preview shows issues (e.g., blank category, malformed IDs)
**When** I click "Cancel"
**Then** no project is created and no files are written

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
