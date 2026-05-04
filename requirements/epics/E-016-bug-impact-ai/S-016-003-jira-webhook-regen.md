# Story: Jira Webhook → Regenerate on Status Change

**ID:** S-016-003
**Project:** morbius
**Epic:** E-016
**Stage:** Ready
**Status:** Done
**Priority:** P0
**Version:** 1.1
**Created:** 2026-04-23
**Updated:** 2026-04-23

---

## Story

As a QA lead, I want impact analyses to regenerate automatically when a bug's Jira status changes so that I always see fresh analysis without manual refresh.

## Acceptance Criteria

**Given** E-013 Jira sync is healthy and webhook delivery is reliable
**When** a Jira issue linked to a Morbius bug transitions (open/fixed/reopened/closed)
**Then** an impact regeneration is enqueued within 30 seconds

**Given** a regeneration is enqueued
**When** it runs
**Then** the new impact.md overwrites the previous one and the bug's changelog records "impact-regenerated: status-change"

**Given** Jira webhooks are unreachable
**When** the webhook-receive endpoint is down for >5 minutes
**Then** polling fallback triggers regeneration on the next sync cycle — no state changes are silently missed

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
| 2026-04-23 | 1.1 | Claude | Implemented: new `POST /api/webhook/jira` endpoint accepts Jira's standard payload `{webhookEvent, issue:{key, fields:{status:{name}}}}`, finds the local bug by `jiraKey`, and calls `triggerImpactRegen()` when the status differs from the last-seen value. Polling fallback (AC3): added the same hook inside `syncBugFromJira()` — if a poll detects a status change vs prior `bug.jiraStatus`, regen is triggered through the same path. Both paths share an in-memory dedupe Map keyed by bugId with a 60s window so simultaneous webhook + polling don't double-spend Claude calls. On successful regen, a "impact-regenerated: <reason>" row is appended to the bug's changelog via `updateBugById(_, {}, dir, actor)`. Smoke-tested: webhook returns 200 with `enqueued: BUG-001` for a matching key + status transition, and 200 + `note` for an unknown key (Jira doesn't care about 4xx — keep things 200). AC1 + AC2 + AC3 met. **Production hardening note:** webhook signature validation is intentionally skipped for v1 since RF runs Jira on its own network — add HMAC validation when exposing publicly. |
