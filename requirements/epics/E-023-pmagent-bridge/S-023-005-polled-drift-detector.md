# Story: Polled Drift Detector

**ID:** S-023-005
**Project:** morbius
**Epic:** E-023
**Stage:** Draft
**Status:** Todo
**Priority:** P1
**Version:** 1.0
**Created:** 2026-04-23
**Updated:** 2026-04-23

---

## Story

As a QA lead, I want Morbius to auto-detect changes in PMAgent story files and re-sync without me clicking Transfer every time — a safety net for the case where PMAgent's button doesn't exist yet, or someone edits a story file outside the button flow.

## Acceptance Criteria

**Given** a Morbius project has `pmagentSlug` configured and the drift detector is running (60s tick, mirrors `startJiraReplayTimer`)
**When** any source file under `<pmagentPath>` is modified after the project's `lastSyncAt`
**Then** an incremental transfer runs automatically, scoped to changed stories only

**Given** Settings → Integrations is open
**When** the page renders
**Then** a "PMAgent sync" tile shows `pmagentSlug`, `lastSyncAt`, drift detected (yes/no), recent errors, and a "Sync now" button — mirrors the `JiraHealthPanel` pattern from S-013-002

**Given** the env var `MORBIUS_PMAGENT_POLL=0` is set
**When** the server starts
**Then** the timer does not start, manual `/api/pmagent/transfer` still works, and the Settings tile renders with a "Polling disabled" hint

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
