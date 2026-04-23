# Device Coverage Matrix

**ID:** S-005-003
**Project:** morbius
**Epic:** E-005
**Stage:** Ready
**Status:** Done
**Priority:** P1
**Version:** 1.0
**Created:** 2026-04-21
**Updated:** 2026-04-21

---

## Story

As a QA lead, I want a Devices tab showing a grid of every test × every device with pass/fail status, so I can see at a glance which tests are passing on iPad but failing on Android, and which device has the worst coverage.

## Acceptance Criteria

**Given** multiple devices are configured and tests have been run  
**When** I open the Devices tab  
**Then** a grid shows each device as a column and each test as a row, with a coloured cell for pass/fail/not-run status per (device, test) combination

**Given** I sort the grid by "Pass Rate"  
**When** sorted  
**Then** devices with the lowest pass rate appear first

**Given** no tests have been run on a device  
**When** the grid renders  
**Then** all cells for that device show "not-run" (grey)

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-21 | 1.0 | PM Agent | Created via reverse-engineer |
