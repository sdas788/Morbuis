# Story: Post-Upload Preview + Commit Flow

**ID:** S-014-002
**Project:** morbius
**Epic:** E-014
**Stage:** Ready
**Status:** Done
**Priority:** P0
**Version:** 1.1
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
| 2026-04-23 | 1.1 | Claude | Implemented: split `src/parsers/excel.ts` into `parseExcelFile(path)` (in-memory only — returns `ParsedExcel` with full categories + test cases + sync checksums + skipped sheets) and `writeParsedExcel(parsed, dir)` (disk write). `importExcel()` now composes the two — backwards-compatible. New `POST /api/excel/preview` endpoint runs only the parse half and returns `{ok, categories[], totalTestCases, skippedSheets, sample[]}` (sample = up to 5 test rows across the first few categories with id/title/category/scenario/status). UI: modal phases are `input → parsing → preview → committing`; preview screen shows category list with counts, sample test rows with status dots, and skipped sheet names. Cancel at any phase is a no-op (no project, no files written). AC1 + AC2 + AC3 met. |
