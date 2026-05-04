# Story: Manual Bug Creation UI

**ID:** S-004-002
**Project:** morbius
**Epic:** E-004
**Stage:** Ready
**Status:** Done
**Priority:** P1
**Version:** 1.0
**Created:** 2026-04-21
**Updated:** 2026-04-21

---

## Story

As a tester, I want to create a bug ticket manually from the dashboard (or CLI) with a title, linked test, device, priority, and failure reason, so I can report bugs found during exploratory or manual testing that Maestro didn't catch.

## Acceptance Criteria

**Given** I click "Report Bug" from a test case detail panel  
**When** I fill in the form and submit  
**Then** a bug ticket is created and appears on the Bug board immediately

**Given** I run `morbius create-bug --test TC-2.01 --title "Login fails" --device iPhone --priority high`  
**When** the command runs  
**Then** a bug markdown file is written with the provided fields and an auto-generated ID (bug-NNN)

**Given** I attach a screenshot via the CLI `--screenshot <path>`  
**When** the bug is created  
**Then** the screenshot is copied to `data/{project}/screenshots/` and linked in the bug

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-21 | 1.0 | PM Agent | Created via reverse-engineer |
