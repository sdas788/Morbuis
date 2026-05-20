---
id: TC-CH--005-003-1
title: Bottle History — Test Plan
category: e-005-wine-wallet-gifting
scenario: Negative
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-005-003
  - e-005
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-005-003
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-005-wine-wallet-gifting/T-005-003-bottle-history.md
  source_checksum: d65b032e66ead1ef
---
## Steps
# Test Plan: Bottle History

**ID:** T-005-003
**Project:** ch-mobile
**Story:** S-005-003
**Epic:** E-005
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies the Bottle History screen reached from the Wine Wallet. Covers entry-point navigation, the 18-month history limit, "Month Year" section grouping, the Wine List Tile rendering, opening the Bottle Detail modal in read-only context from a history entry, the empty state, the API error path, and pull-to-refresh data reload.

## Prerequisites

- Member account authenticated with access to the Wine Wallet
- Three seeded test accounts:
  - Account A: 5+ bottles spanning the past 6 months across multiple month buckets
  - Account B: zero history entries
  - Account C: history entries exceeding 18 months in age (some inside, some outside the 18-month window)
- Test proxy able to simulate failure on `GET /membership/{id}/bottle-history`
- Bottle Detail modal (S-005-002) functional — required for entry-tap navigation

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (list grouped by Month Year) | TC-005-003-001 (P0) | ✓ |
| AC-002 (Wine List Tile fields) | TC-005-003-001 (P0) | ✓ |
| AC-003 (tap entry → detail popup, read-only) | TC-005-003-001 (P0), TC-005-003-002 | ✓ |
| AC-004 (empty state) | TC-005-003-003 | ✓ |
| AC-005 (history API error → modal) | TC-005-003-004 | ✓ |
| AC-006 (pull-to-refresh reloads) | TC-005-003-005 | ✓ |
| AC-007 (only most recent 18 months) | TC-005-003-006 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-005-003-001: Navigate from wallet to history, verify grouping and tile fields, open detail in read-only

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002, AC-003
**Dependencies:** S-005-001 (wallet entry point) and S-005-002 (Bottle Detail modal) must be Done

**Captures:**
| Label | Screen | State

## Expected Result
# Test Plan: Bottle History

**ID:** T-005-003
**Project:** ch-mobile
**Story:** S-005-003
**Epic:** E-005
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies the Bottle History screen reached from the Wine Wallet. Covers entry-point navigation, the 18-month history limit, "Month Year" section grouping, the Wine List Tile rendering, opening the Bottle Detail modal in read-only context from a history entry, the empty state, the API error path, and pull-to-refresh data reload.

## Prerequisites

- Member account authenticated with access to the Wine Wallet
- Three seeded test accounts:
  - Account A: 5+ bottles spanning the past 6 months across multiple month buckets
  - Account B: zero history entries
  - Account C: history entries exceeding 18 months in age (some inside, some outside the 18-month window)
- Test proxy able to simulate failure on `GET /membership/{id}/bottle-history`
- Bottle Detail modal (S-005-002) functional — required for entry-tap navigation

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (list grouped by Month Year) | TC-005-003-001 (P0) | ✓ |
| AC-002 (Wine List Tile fields) | TC-005-003-001 (P0) | ✓ |
| AC-003 (tap entry → detail popup, read-only) | TC-005-003-001 (P0), TC-005-003-002 | ✓ |
| AC-004 (empty state) | TC-005-003-003 | ✓ |
| AC-005 (history API error → modal) | TC-005-003-004 | ✓ |
| AC-006 (pull-to-refresh reloads) | TC-005-003-005 | ✓ |
| AC-007 (only most recent 18 months) | TC-005-003-006 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-005-003-001: Navigate from wallet to history, verify grouping and tile fields, open detail in read-only

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002, AC-003
**Dependencies:** S-005-001 (wallet entry point) and S-005-002 (Bottle Detail modal) must be Done

**Captures:**
| Label | Screen | State

