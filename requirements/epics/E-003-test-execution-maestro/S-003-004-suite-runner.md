# Story: Full Suite Runner

**ID:** S-003-004
**Project:** morbius
**Epic:** E-003
**Stage:** Ready
**Status:** Done
**Priority:** P2
**Version:** 1.0
**Created:** 2026-04-21
**Updated:** 2026-04-21

---

## Story

As a QA lead, I want a "Run All" button that executes all Maestro flows in the configured sequence and shows a progress bar, so I can run the full regression suite with one click and monitor progress without managing individual flows.

## Acceptance Criteria

**Given** all flows are configured  
**When** I click "Run All"  
**Then** flows execute in numbered order (01_login → 02_create_account → ... → 14_delete_account) with a progress bar showing current/total

**Given** a flow in the sequence fails  
**When** it is a non-destructive flow  
**Then** the suite continues with the next flow (not aborted)

**Given** a destructive flow (12–14) fails  
**When** the suite reaches it  
**Then** the suite stops and shows a warning that destructive flows were not completed

**Given** the suite completes  
**When** all flows are done  
**Then** a summary shows total pass/fail counts and a new run record is saved

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-21 | 1.0 | PM Agent | Created via reverse-engineer |
