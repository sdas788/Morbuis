# Export Test Changes Back to Excel

**ID:** S-002-002
**Project:** morbius
**Epic:** E-002
**Stage:** Ready
**Status:** Done
**Priority:** P0
**Version:** 1.0
**Created:** 2026-04-21
**Updated:** 2026-04-21

---

## Story

As a QA lead, I want to run `morbius export <xlsx-path>` to write all status, priority, and notes changes from the dashboard back into the original Excel file, so the Excel QA plan stays in sync with what the team has been tracking in Morbius.

## Acceptance Criteria

**Given** test cases have been updated in the dashboard  
**When** I run `morbius export "QA Plan.xlsx"`  
**Then** the status, priority, and notes columns are updated in the correct rows of the correct sheets, and all other cells are left untouched

**Given** a test case exists in Morbius but not in the Excel  
**When** export runs  
**Then** that test is skipped (no new rows are inserted)

**Given** the export completes  
**When** I open the Excel  
**Then** all updated cells reflect the latest values from the markdown files

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-21 | 1.0 | PM Agent | Created via reverse-engineer |
