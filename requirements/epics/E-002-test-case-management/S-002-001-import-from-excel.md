# Story: Import Test Cases from Excel

**ID:** S-002-001
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

As a QA lead, I want to run `morbius import <xlsx-path>` and have all test cases from the Excel QA plan imported as markdown files, so the team never manually copies data between Excel and Morbius.

## Acceptance Criteria

**Given** an Excel file with multiple sheets (one per test category)  
**When** I run `morbius import "QA Plan.xlsx"`  
**Then** each sheet becomes a category folder under `data/{project}/tests/` and each row becomes a `tc-{id}-{slug}.md` file with all columns mapped (ID, Steps, AC, Scenario, Status, Notes, Device Results)

**Given** the Excel has a "Summary", "Index", or "Template" sheet  
**When** import runs  
**Then** those sheets are silently skipped

**Given** the import has run before  
**When** I run import again  
**Then** existing test case files are updated (not duplicated) using the sync-meta.json checksum registry

**Given** device result columns (iPad, iPhone, Android Tab, Phone) exist  
**When** imported  
**Then** device results are stored as a structured array in the frontmatter, not as raw text

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-21 | 1.0 | PM Agent | Created via reverse-engineer |
