# Story: Auto-Create Bug Tickets from Maestro Failures

**ID:** S-004-001
**Project:** morbius
**Epic:** E-004
**Stage:** Ready
**Status:** Done
**Priority:** P0
**Version:** 1.0
**Created:** 2026-04-21
**Updated:** 2026-04-21

---

## Story

As a QA lead, I want every Maestro test failure to automatically create a bug ticket with the failing step, device info, and screenshot, so no failure gets lost and the team can triage immediately from the Bug board.

## Acceptance Criteria

**Given** a Maestro flow fails during ingest  
**When** a failure is detected  
**Then** a bug markdown file is created with: id, title (from flow name), linked test ID, device, run ID, failing step, failure reason, and screenshot path

**Given** a bug for the same test + device already exists with status "open" or "investigating"  
**When** the same test fails again  
**Then** the existing bug is updated (not duplicated) and the new run is added to its history

**Given** a test failure has no screenshot  
**When** the bug is created  
**Then** the bug is created without a screenshot (no error thrown)

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-21 | 1.0 | PM Agent | Created via reverse-engineer |
