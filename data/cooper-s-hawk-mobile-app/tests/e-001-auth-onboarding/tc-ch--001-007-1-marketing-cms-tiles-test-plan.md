---
id: TC-CH--001-007-1
title: Marketing CMS Tiles — Test Plan
category: e-001-auth-onboarding
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-001-007
  - e-001
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-001-007
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-001-auth-onboarding/T-001-007-marketing-cms-tiles.md
  source_checksum: a483b27405406e1f
---
## Steps
# Test Plan: Marketing CMS Tiles

**ID:** T-001-007
**Project:** ch-mobile
**Story:** S-001-007
**Epic:** E-001
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Validate that the `MarketingCard` component renders CMS-driven content correctly across the Dashboard (medium + large tiles in a Carousel), Wine Wallet (small `CHPromotions` + marketing tiles), and Account screens; that audience targeting respects the `segment` filter (member vs non-member); that "Learn More" opens external URLs in the in-app browser; and that the CMS-driven `displayType` controls tile size.

## Prerequisites

- CMS / promotions endpoint reachable in staging with controllable tile fixtures
- Seeded tile fixtures in the CMS:
  - `tile-large-1` — `displayType: largeBanner`, `segment: all`, valid date range
  - `tile-medium-1` — `displayType: mediumBanner`, `segment: all`
  - `tile-small-1` — `displayType: smallBanner`, `segment: all`
  - `tile-member-only` — `displayType: mediumBanner`, `segment: member`
  - `tile-non-member` — `displayType: mediumBanner`, `segment: nonmember`
  - `tile-expired` — `displayType: mediumBanner`, `segment: all`, end date in the past
- A logged-in member account `qa-tiles-member@chwinery.test`
- Guest mode entry available (Continue as Guest from Initial)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (Dashboard renders medium + large in Carousel) | TC-001-007-001 (P0) | ✓ |
| AC-002 (Learn More → in-app browser) | TC-001-007-001 (P0), TC-001-007-002 | ✓ |
| AC-003 (Member-only tiles hidden from guests) | TC-001-007-001 (P0), TC-001-007-003 | ✓ |
| AC-004 (Wine Wallet shows small promotions via CHPromotions) | TC-001-007-001 (P0), TC-001-007-004 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-001-007-001: Member views Dashboard, Wine Wallet, and Account — sees segment-filtered medium/la

## Expected Result
# Test Plan: Marketing CMS Tiles

**ID:** T-001-007
**Project:** ch-mobile
**Story:** S-001-007
**Epic:** E-001
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Validate that the `MarketingCard` component renders CMS-driven content correctly across the Dashboard (medium + large tiles in a Carousel), Wine Wallet (small `CHPromotions` + marketing tiles), and Account screens; that audience targeting respects the `segment` filter (member vs non-member); that "Learn More" opens external URLs in the in-app browser; and that the CMS-driven `displayType` controls tile size.

## Prerequisites

- CMS / promotions endpoint reachable in staging with controllable tile fixtures
- Seeded tile fixtures in the CMS:
  - `tile-large-1` — `displayType: largeBanner`, `segment: all`, valid date range
  - `tile-medium-1` — `displayType: mediumBanner`, `segment: all`
  - `tile-small-1` — `displayType: smallBanner`, `segment: all`
  - `tile-member-only` — `displayType: mediumBanner`, `segment: member`
  - `tile-non-member` — `displayType: mediumBanner`, `segment: nonmember`
  - `tile-expired` — `displayType: mediumBanner`, `segment: all`, end date in the past
- A logged-in member account `qa-tiles-member@chwinery.test`
- Guest mode entry available (Continue as Guest from Initial)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (Dashboard renders medium + large in Carousel) | TC-001-007-001 (P0) | ✓ |
| AC-002 (Learn More → in-app browser) | TC-001-007-001 (P0), TC-001-007-002 | ✓ |
| AC-003 (Member-only tiles hidden from guests) | TC-001-007-001 (P0), TC-001-007-003 | ✓ |
| AC-004 (Wine Wallet shows small promotions via CHPromotions) | TC-001-007-001 (P0), TC-001-007-004 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-001-007-001: Member views Dashboard, Wine Wallet, and Account — sees segment-filtered medium/la

