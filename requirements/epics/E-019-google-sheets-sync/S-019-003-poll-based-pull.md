# Poll-Based Pull with Timestamp Conflict Rule

**ID:** S-019-003
**Project:** morbius
**Epic:** E-019
**Stage:** Draft
**Status:** Todo
**Priority:** P2
**Version:** 1.0
**Created:** 2026-04-23
**Updated:** 2026-04-23

---

## Story

As a QA lead, I want Morbius to poll the bound Sheet on an interval and pull changes so that updates made in Sheets appear in Morbius without me clicking "Sync Now" every time.

## Acceptance Criteria

**Given** a bound Sheet and configured poll interval (5–60 min)
**When** the interval elapses
**Then** Morbius fetches all tab values, diffs against local markdown, and applies changes — writing changelog entries for each changed row

**Given** a row has been edited in both Sheets and Morbius since the last sync
**When** conflict is detected
**Then** the timestamp rule applies: whichever side's `updated` timestamp is newer wins; the losing edit is logged to changelog as "sheets-conflict-resolved"

**Given** the Sheets API returns an error
**When** polling runs
**Then** the error is logged to the Google Sheets health panel; next poll retries; no data is corrupted

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
