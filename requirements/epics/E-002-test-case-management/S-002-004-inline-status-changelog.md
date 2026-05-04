# Story: Inline Status Update + Per-File Changelog

**ID:** S-002-004
**Project:** morbius
**Epic:** E-002
**Stage:** Ready
**Status:** Done
**Priority:** P1
**Version:** 1.0
**Created:** 2026-04-21
**Updated:** 2026-04-21

---

## Story

As a tester, I want to click the status pill on any test card and update it instantly, with the change automatically logged in the file's changelog, so the history of every test is auditable without a separate tracking system.

## Acceptance Criteria

**Given** I click a status pill on a test card  
**When** I select a new status  
**Then** the card updates immediately in the UI and a `POST /api/test/update` writes the change to the markdown file

**Given** a status update is saved  
**When** I open the test case detail  
**Then** the changelog table shows: timestamp, field ("status"), old value, new value, actor

**Given** I update notes on a test  
**When** I click away  
**Then** the notes auto-save and appear in the changelog as a notes update

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-21 | 1.0 | PM Agent | Created via reverse-engineer |
