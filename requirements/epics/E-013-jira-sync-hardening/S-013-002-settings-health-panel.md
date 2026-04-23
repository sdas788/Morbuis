# Jira Sync Health Panel in Settings

**ID:** S-013-002
**Project:** morbius
**Epic:** E-013
**Stage:** Draft
**Status:** Todo
**Priority:** P0
**Version:** 1.0
**Created:** 2026-04-23
**Updated:** 2026-04-23

---

## Story

As a QA lead, I want a Jira sync health panel in Settings so that I can see at a glance whether sync is working, when it last ran, and what's pending — without having to open Jira to find out.

## Acceptance Criteria

**Given** Settings → Integrations → Jira is open
**When** the health panel renders
**Then** it shows: last successful sync time, sync status (healthy / degraded / broken), pending write queue count, and the last 5 error messages with timestamps

**Given** sync has been broken for >5 minutes
**When** the panel renders
**Then** a red status indicator and suggested remediation action are visible

**Given** the user clicks "Sync Now"
**When** the manual sync completes
**Then** the health panel refreshes with the new timestamp and any new errors

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
