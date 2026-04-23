# Audit & Fix Jira Sync Failure Modes

**ID:** S-013-001
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

As a QA lead, I want the root cause of Jira sync failures identified and fixed so that bug state stays consistent between Morbius and Jira without manual reconciliation.

## Acceptance Criteria

**Given** the Jira sync code is instrumented with structured logging
**When** a sync operation runs
**Then** each failure mode (auth, webhook drift, write conflict, rate limit) is logged with a distinct error code and the last 20 errors are readable via an API endpoint

**Given** a reproducible failure mode has been identified
**When** the root cause fix is deployed
**Then** a 7-day canary run shows >99% sync success rate with no silent data loss

**Given** a Jira API call fails transiently
**When** the sync retries
**Then** the retry uses exponential backoff and does not mask persistent failures as transient (escalates after 3 attempts)

**Given** the fix is complete
**When** a QA lead runs a round-trip test (create ticket in Jira → see in Morbius → update in Morbius → see in Jira)
**Then** all steps complete within 2 minutes with no manual sync buttons needed

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
