# Jira Webhook → Regenerate on Status Change

**ID:** S-016-003
**Project:** morbius
**Epic:** E-016
**Stage:** Draft
**Status:** Todo
**Priority:** P0
**Version:** 1.0
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
