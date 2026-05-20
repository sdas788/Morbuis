---
id: TC-CH--003-007-1
title: Upcoming Events — Test Plan
category: e-003-dining-reservations
scenario: Negative
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-003-007
  - e-003
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-003-007
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-003-dining-reservations/T-003-007-upcoming-events.md
  source_checksum: e192af508a506604
---
## Steps
# Test Plan: Upcoming Events

**ID:** T-003-007
**Project:** ch-mobile
**Story:** S-003-007
**Epic:** E-003
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies that guests and members can browse upcoming events sourced from EventBrite, filter by location via the InlineLocator, see chronological sort order, and observe the differentiated tap behavior (member → EventBrite event page; non-member → potential-member popup). Confirms event-detail content, the empty-state for no events, pull-to-refresh, store-detail "See all" navigation, and the location defaulting cascade (preferred → GPS-nearest → first in list).

## Prerequisites

- Staging environment with the EventBrite-backed events feed exposed via the app's event service.
- Member account M1 with preferred location LOC-A.
- Member account M2 with preferred location LOC-B.
- Guest (unauthenticated) test session with mock GPS configurable.
- Seeded events: at least three for LOC-A on different dates; at least one for LOC-B; at least one location LOC-EMPTY with no events.
- Both iOS and Android devices available for tap-behavior parity check.
- Network online.

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (events listed chronologically with title/date/location) | TC-003-007-001 (P0) | Yes |
| AC-002 (location filter limits events) | TC-003-007-001 (P0) | Yes |
| AC-003 (member tap → EventBrite page) | TC-003-007-001 (P0) | Yes |
| AC-004 (non-member tap → potential member popup) | TC-003-007-002 | Yes |
| AC-005 (store details "See all" → main hosted events) | TC-003-007-003 | Yes |
| AC-006 (no events → "No upcoming events") | TC-003-007-004 | Yes |
| AC-007 (pull-to-refresh → updated event data) | TC-003-007-001 (P0) | Yes |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-003-007-001: Member browses, filters, taps an event, and refresh

## Expected Result
# Test Plan: Upcoming Events

**ID:** T-003-007
**Project:** ch-mobile
**Story:** S-003-007
**Epic:** E-003
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies that guests and members can browse upcoming events sourced from EventBrite, filter by location via the InlineLocator, see chronological sort order, and observe the differentiated tap behavior (member → EventBrite event page; non-member → potential-member popup). Confirms event-detail content, the empty-state for no events, pull-to-refresh, store-detail "See all" navigation, and the location defaulting cascade (preferred → GPS-nearest → first in list).

## Prerequisites

- Staging environment with the EventBrite-backed events feed exposed via the app's event service.
- Member account M1 with preferred location LOC-A.
- Member account M2 with preferred location LOC-B.
- Guest (unauthenticated) test session with mock GPS configurable.
- Seeded events: at least three for LOC-A on different dates; at least one for LOC-B; at least one location LOC-EMPTY with no events.
- Both iOS and Android devices available for tap-behavior parity check.
- Network online.

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (events listed chronologically with title/date/location) | TC-003-007-001 (P0) | Yes |
| AC-002 (location filter limits events) | TC-003-007-001 (P0) | Yes |
| AC-003 (member tap → EventBrite page) | TC-003-007-001 (P0) | Yes |
| AC-004 (non-member tap → potential member popup) | TC-003-007-002 | Yes |
| AC-005 (store details "See all" → main hosted events) | TC-003-007-003 | Yes |
| AC-006 (no events → "No upcoming events") | TC-003-007-004 | Yes |
| AC-007 (pull-to-refresh → updated event data) | TC-003-007-001 (P0) | Yes |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-003-007-001: Member browses, filters, taps an event, and refresh

