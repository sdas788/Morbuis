# Drag-and-Drop Excel Upload in New-Project Modal

**ID:** S-014-001
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

As a QA lead starting a new project, I want to drag an Excel test plan onto the new-project modal in the dashboard so that I don't have to open a terminal and run `morbius import`.

## Acceptance Criteria

**Given** the "Create Project" modal is open
**When** I drag an `.xlsx` file onto the drop zone
**Then** the file uploads, the project is created, and test cases are imported — all in one flow

**Given** the file is not a valid `.xlsx`
**When** upload is attempted
**Then** a clear error message is shown and the project is not created

**Given** the project is created successfully
**When** I navigate to the test board
**Then** imported categories and test cases appear in the kanban with no additional action required

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
