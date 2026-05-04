# Story: Bug Kanban Board + Status Workflow

**ID:** S-004-003
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

As a QA lead, I want a Bug board with four columns (Open, Investigating, Fixed, Closed) where I can move bugs through their lifecycle by clicking, so the team has a shared view of every open issue without needing Jira open.

## Acceptance Criteria

**Given** bugs exist  
**When** I open the Bugs tab  
**Then** bugs are shown in Kanban columns by status: Open, Investigating, Fixed, Closed

**Given** I click a bug's status pill  
**When** I select a new status  
**Then** the bug moves to the new column and the change is written to the markdown file with a changelog entry

**Given** I click a bug card to expand it  
**When** the detail panel opens  
**Then** I see: title, linked test, device, priority, failure reason, screenshot (if any), notes textarea, selector analysis warnings, Jira badge (if synced), and full changelog

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-21 | 1.0 | PM Agent | Created via reverse-engineer |
