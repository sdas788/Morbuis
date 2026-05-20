---
id: TC-CH--006-001-1
title: View Rewards — Test Plan
category: e-006-rewards-points
scenario: Negative
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-006-001
  - e-006
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-006-001
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-006-rewards-points/T-006-001-view-rewards.md
  source_checksum: 7c4982c6d63f9ca7
---
## Steps
# Test Plan: View Rewards

**ID:** T-006-001
**Project:** ch-mobile
**Story:** S-006-001
**Epic:** E-006
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies that authenticated members can view their rewards standing across the Account screen and the Rewards screen. Covers the three account tiles (Bottles, Rewards, Tastings) including the 1-bottle tasting tooltip, the animated semicircle member points graph (0-350), the swipeable section linking to the Ambassador view, the "View History" navigation link, and the Active/Past rewards lists with their empty states. Confirms data is fetched via `GET /membership/{memberId}/rewards`, the loading skeleton appears, pull-to-refresh works, and API errors surface a retry option.

## Prerequisites

- Authenticated member account (multiple variants needed: 1-bottle, 2-bottle, ambassador-tier) is provisioned in the staging environment.
- Mock or seeded `GET /membership/{memberId}/rewards` data covering active rewards, past rewards (redeemed and expired), and an empty-rewards state.
- Member point balance seeded between 0 and 350 for animation verification.
- Network conditions controllable to simulate API failure for the retry path.
- App build with rewards screen routing enabled.

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (tiles show numeric values) | TC-006-001-001 (P0), TC-006-001-006 | ✓ |
| AC-002 (1-bottle tasting tooltip) | TC-006-001-001 (P0), TC-006-001-002 | ✓ |
| AC-003 (animated points graph + remaining text) | TC-006-001-001 (P0), TC-006-001-007 | ✓ |
| AC-004 (swipe to ambassador view) | TC-006-001-001 (P0), TC-006-001-008 | ✓ |
| AC-005 (View History navigates) | TC-006-001-001 (P0), TC-006-001-009 | ✓ |
| AC-006 (active rewards render) | TC-006-001-001 (P0) | ✓ |
| AC-007 (no active rewards empty state) | TC-006-001-001 (P0), TC-006-001-003 | ✓ |
| AC-008 (past rewards render) | TC-006-001-001 (P0) | ✓ |
| AC-009 

## Expected Result
# Test Plan: View Rewards

**ID:** T-006-001
**Project:** ch-mobile
**Story:** S-006-001
**Epic:** E-006
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies that authenticated members can view their rewards standing across the Account screen and the Rewards screen. Covers the three account tiles (Bottles, Rewards, Tastings) including the 1-bottle tasting tooltip, the animated semicircle member points graph (0-350), the swipeable section linking to the Ambassador view, the "View History" navigation link, and the Active/Past rewards lists with their empty states. Confirms data is fetched via `GET /membership/{memberId}/rewards`, the loading skeleton appears, pull-to-refresh works, and API errors surface a retry option.

## Prerequisites

- Authenticated member account (multiple variants needed: 1-bottle, 2-bottle, ambassador-tier) is provisioned in the staging environment.
- Mock or seeded `GET /membership/{memberId}/rewards` data covering active rewards, past rewards (redeemed and expired), and an empty-rewards state.
- Member point balance seeded between 0 and 350 for animation verification.
- Network conditions controllable to simulate API failure for the retry path.
- App build with rewards screen routing enabled.

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (tiles show numeric values) | TC-006-001-001 (P0), TC-006-001-006 | ✓ |
| AC-002 (1-bottle tasting tooltip) | TC-006-001-001 (P0), TC-006-001-002 | ✓ |
| AC-003 (animated points graph + remaining text) | TC-006-001-001 (P0), TC-006-001-007 | ✓ |
| AC-004 (swipe to ambassador view) | TC-006-001-001 (P0), TC-006-001-008 | ✓ |
| AC-005 (View History navigates) | TC-006-001-001 (P0), TC-006-001-009 | ✓ |
| AC-006 (active rewards render) | TC-006-001-001 (P0) | ✓ |
| AC-007 (no active rewards empty state) | TC-006-001-001 (P0), TC-006-001-003 | ✓ |
| AC-008 (past rewards render) | TC-006-001-001 (P0) | ✓ |
| AC-009 

