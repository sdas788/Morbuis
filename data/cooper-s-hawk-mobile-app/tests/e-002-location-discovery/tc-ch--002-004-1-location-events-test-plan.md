---
id: TC-CH--002-004-1
title: Location Events — Test Plan
category: e-002-location-discovery
scenario: Negative
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-002-004
  - e-002
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-002-004
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-002-location-discovery/T-002-004-location-events.md
  source_checksum: 1b8790befbb4c6f9
---
## Steps
# Test Plan: Location Events

**ID:** T-002-004
**Project:** ch-mobile
**Story:** S-002-004
**Epic:** E-002
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

This plan verifies the upcoming-events list rendered inside the Location Details screen. Coverage includes the chronological sort (nearest first), the empty-state message when no upcoming events exist, the 5-item cap with "See All" link, navigation to the full event detail when an event tile is tapped, and the events refresh path on pull-to-refresh of the parent Location Details screen. Past events must never appear.

## Prerequisites

- App build with Location Details (S-002-002) reachable from the Store Locator (S-002-001).
- `GET /event?locationId={id}` reachable and able to be primed with controlled fixtures.
- Three seeded test locations:
  - **Location A** — has 7 upcoming events spread over the next 90 days plus 2 past events (to verify sort + 5-cap + "See All" + past-event hiding).
  - **Location B** — has 0 upcoming events.
  - **Location C** — has exactly 3 upcoming events (to verify the no-cap path).
- Logged-in or guest session — the events section is visible to all users; member vs non-member event-tile-tap behavior is the responsibility of S-002-002 and is out of scope here.

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (events shown sorted by date with title and time) | TC-002-004-001 (P0), TC-002-004-002 | ✓ |
| AC-002 (no upcoming events → "No upcoming events at this location") | TC-002-004-001 (P0), TC-002-004-003 | ✓ |
| AC-003 (more than 5 events → only 5 shown + "See All") | TC-002-004-001 (P0), TC-002-004-004 | ✓ |
| AC-004 (tapping event card navigates to event detail) | TC-002-004-001 (P0), TC-002-004-005 | ✓ |
| AC-005 (pull-to-refresh on parent reloads events) | TC-002-004-001 (P0), TC-002-004-006 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow te

## Expected Result
# Test Plan: Location Events

**ID:** T-002-004
**Project:** ch-mobile
**Story:** S-002-004
**Epic:** E-002
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

This plan verifies the upcoming-events list rendered inside the Location Details screen. Coverage includes the chronological sort (nearest first), the empty-state message when no upcoming events exist, the 5-item cap with "See All" link, navigation to the full event detail when an event tile is tapped, and the events refresh path on pull-to-refresh of the parent Location Details screen. Past events must never appear.

## Prerequisites

- App build with Location Details (S-002-002) reachable from the Store Locator (S-002-001).
- `GET /event?locationId={id}` reachable and able to be primed with controlled fixtures.
- Three seeded test locations:
  - **Location A** — has 7 upcoming events spread over the next 90 days plus 2 past events (to verify sort + 5-cap + "See All" + past-event hiding).
  - **Location B** — has 0 upcoming events.
  - **Location C** — has exactly 3 upcoming events (to verify the no-cap path).
- Logged-in or guest session — the events section is visible to all users; member vs non-member event-tile-tap behavior is the responsibility of S-002-002 and is out of scope here.

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (events shown sorted by date with title and time) | TC-002-004-001 (P0), TC-002-004-002 | ✓ |
| AC-002 (no upcoming events → "No upcoming events at this location") | TC-002-004-001 (P0), TC-002-004-003 | ✓ |
| AC-003 (more than 5 events → only 5 shown + "See All") | TC-002-004-001 (P0), TC-002-004-004 | ✓ |
| AC-004 (tapping event card navigates to event detail) | TC-002-004-001 (P0), TC-002-004-005 | ✓ |
| AC-005 (pull-to-refresh on parent reloads events) | TC-002-004-001 (P0), TC-002-004-006 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow te

