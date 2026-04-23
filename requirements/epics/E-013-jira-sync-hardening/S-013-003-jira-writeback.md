# Jira Write-Back for Morbius Bug Edits

**ID:** S-013-003
**Project:** morbius
**Epic:** E-013
**Stage:** Draft
**Status:** Todo
**Priority:** P1
**Version:** 1.0
**Created:** 2026-04-23
**Updated:** 2026-04-23

---

## Story

As a QA lead, I want edits I make to a bug in Morbius to propagate back to Jira so that Jira stays the single source of truth without me having to duplicate updates.

## Acceptance Criteria

**Given** a bug is linked to a Jira issue
**When** I update its status, assignee, or notes in Morbius
**Then** the Jira issue reflects the change within one sync cycle (<60s)

**Given** a screenshot is attached to a bug in Morbius
**When** write-back runs
**Then** the screenshot is uploaded as an attachment to the Jira issue (once per screenshot, deduped by hash)

**Given** a write-back fails due to a Jira API error
**When** the failure occurs
**Then** the edit is queued in the replay queue (see S-013-004) and the health panel shows the pending count

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
