# Run Individual Flow from Dashboard

**ID:** S-003-002
**Project:** morbius
**Epic:** E-003
**Stage:** Ready
**Status:** Done
**Priority:** P1
**Version:** 1.0
**Created:** 2026-04-21
**Updated:** 2026-04-21

---

## Story

As a developer, I want to click "Run" on any Maestro flow from the dashboard and have it execute on the connected device, so I can trigger test runs without switching to a terminal.

## Acceptance Criteria

**Given** a device is connected and Maestro CLI is installed  
**When** I click Run on a flow  
**Then** `POST /api/flow/run` spawns the Maestro process and a spinner with elapsed time appears on the card

**Given** the flow completes  
**When** Maestro exits  
**Then** the card shows pass (green) or fail (red) badge and the test case status is updated in the markdown file

**Given** the flow fails  
**When** the failure is detected  
**Then** a bug ticket is automatically created with the failure reason and screenshot path

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-21 | 1.0 | PM Agent | Created via reverse-engineer |
