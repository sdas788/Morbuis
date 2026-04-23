# Failed-Sync Replay Queue

**ID:** S-013-004
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

As a QA lead, I want failed Jira sync operations automatically retried so that transient network or API issues don't result in silent data loss.

## Acceptance Criteria

**Given** a sync operation fails due to a retriable error (network, 5xx, rate limit)
**When** the failure occurs
**Then** the operation is stored in `data/{projectId}/jira-sync-state.json` replay queue with timestamp, error, and payload

**Given** items exist in the replay queue
**When** the next sync cycle runs
**Then** queued items are replayed first, with exponential backoff; on success they're removed from the queue

**Given** a queued item has failed >10 times over 24h
**When** the next replay runs
**Then** the item is marked as "stuck," surfaced in the health panel, and requires manual action (retry / discard)

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
