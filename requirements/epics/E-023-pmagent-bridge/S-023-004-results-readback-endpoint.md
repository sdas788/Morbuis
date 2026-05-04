# Story: Results-Readback Endpoint

**ID:** S-023-004
**Project:** morbius
**Epic:** E-023
**Stage:** Draft
**Status:** Todo
**Priority:** P0
**Version:** 1.0
**Created:** 2026-04-23
**Updated:** 2026-04-23

---

## Story

As the future PMAgent Reflect button (out of scope), I want to fetch Morbius run state for a story so I can render pass/fail status next to each AC on the spec side. As the Morbius developer, I expose this endpoint cleanly without building the button itself.

## Acceptance Criteria

**Given** a Morbius project has test cases imported from PMAgent
**When** I `GET /api/pmagent/results?slug=<>&storyId=<>`
**Then** I receive `{ ok, storyId, perAc: { [acIndex]: { testIds[], lastStatus, lastRunAt, runs[last 5] } } }` aggregated from each test case's history

**Given** no test cases match the slug + storyId
**When** the endpoint is called
**Then** it returns 200 with `{ ok: true, perAc: {} }` (empty, not an error — PMAgent renders an "untested" state)

**Given** Maestro runs land for one of the imported test cases after a previous fetch
**When** the endpoint is called again
**Then** the new run appears in the returned `runs[]` for the matching `acIndex`

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
