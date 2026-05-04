# Story: Failed-Sync Replay Queue

**ID:** S-013-004
**Project:** morbius
**Epic:** E-013
**Stage:** Ready
**Status:** Done
**Priority:** P1
**Version:** 1.1
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
| 2026-04-23 | 1.1 | Claude | Implemented: persisted state file `data/{projectId}/jira-sync-state.json` with shape `{lastSuccessAt, lastErrorAt, queue[], attachmentHashes{}}`. `enqueueJiraReplay()` only queues retryable codes (NETWORK / RATE_LIMIT / SERVER); deterministic codes (AUTH / PERMISSION / NOT_FOUND / BAD_REQUEST / CONFIG) are surfaced loudly but not retried. Items dedupe on `(kind, bugId)`. Per-item exponential backoff: 2^attempts seconds, capped at 1h. 60s background ticker (`startJiraReplayTimer` → started from `server.listen` callback) replays eligible items for the active project. Stuck rule: `attempts > 10` AND first failure >24h ago. Manual endpoints: `POST /api/jira/queue/:id/retry` (drops attempt counter, runs immediately, removes on success) and `POST /api/jira/queue/:id/discard` (force-drop). Replay handlers exist for all five queue kinds: `sync-bug`, `writeback-status`, `writeback-priority`, `writeback-comment`, `writeback-attachment`. Surfaces in the Settings health panel (S-013-002). AC1, AC2, AC3 met. |
