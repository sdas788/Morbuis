---
id: TC-CH--005-001-1
title: Wine Wallet Overview — Test Plan
category: e-005-wine-wallet-gifting
scenario: Negative
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-005-001
  - e-005
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-005-001
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-005-wine-wallet-gifting/T-005-001-wine-wallet-overview.md
  source_checksum: 3d246af845063872
---
## Steps
# Test Plan: Wine Wallet Overview

**ID:** T-005-001
**Project:** ch-mobile
**Story:** S-005-001
**Epic:** E-005
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies the Wine Wallet overview screen for members, delivery members, gifted-bottle members, potential members, and guests. Covers carousel and list view modes, the placeholder bottle logic for 0–3+ bottles, the title variants (standard, "Recent and Upcoming Bottles", "Recent Wines of the Month"), navigation to bottle detail, the `insiderGifting` gating of the "Send a Gift Bottle" button, the Bottle History link, pull-to-refresh, and the bottles API error path.

## Prerequisites

- Staging environment with `GET /membership/{id}/bottles` and `GET /customer` reachable
- Test accounts seeded for: 0-bottle member, 1-bottle member, 2-bottle member, 3+ bottle member, member with at least one gifted bottle, delivery membership member (`isDelivery: true`), potential member, guest user
- `insiderGifting` API boolean configurable per test account (true and false variants seeded)
- Device with location services enabled and granted to the app
- Member authenticated and on the home screen with the menu accessible

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (carousel renders title + bottles) | TC-005-001-001 (P0) | ✓ |
| AC-002 (0 bottles → 3 placeholders) | TC-005-001-001 (P0), TC-005-001-002 | ✓ |
| AC-003 (1 bottle → centered + 2 placeholders + upgrade copy) | TC-005-001-001 (P0), TC-005-001-003 | ✓ |
| AC-004 (gifted subtitle "Gifted from [name]") | TC-005-001-001 (P0), TC-005-001-004 | ✓ |
| AC-005 (delivery title "Recent and Upcoming Bottles") | TC-005-001-001 (P0), TC-005-001-005 | ✓ |
| AC-006 (list view tiles) | TC-005-001-001 (P0), TC-005-001-006 | ✓ |
| AC-007 (potential member view) | TC-005-001-001 (P0), TC-005-001-007 | ✓ |
| AC-008 (insiderGifting=true → button visible) | TC-005-001-001 (P0) | ✓ |
| AC-009 (in

## Expected Result
# Test Plan: Wine Wallet Overview

**ID:** T-005-001
**Project:** ch-mobile
**Story:** S-005-001
**Epic:** E-005
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies the Wine Wallet overview screen for members, delivery members, gifted-bottle members, potential members, and guests. Covers carousel and list view modes, the placeholder bottle logic for 0–3+ bottles, the title variants (standard, "Recent and Upcoming Bottles", "Recent Wines of the Month"), navigation to bottle detail, the `insiderGifting` gating of the "Send a Gift Bottle" button, the Bottle History link, pull-to-refresh, and the bottles API error path.

## Prerequisites

- Staging environment with `GET /membership/{id}/bottles` and `GET /customer` reachable
- Test accounts seeded for: 0-bottle member, 1-bottle member, 2-bottle member, 3+ bottle member, member with at least one gifted bottle, delivery membership member (`isDelivery: true`), potential member, guest user
- `insiderGifting` API boolean configurable per test account (true and false variants seeded)
- Device with location services enabled and granted to the app
- Member authenticated and on the home screen with the menu accessible

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (carousel renders title + bottles) | TC-005-001-001 (P0) | ✓ |
| AC-002 (0 bottles → 3 placeholders) | TC-005-001-001 (P0), TC-005-001-002 | ✓ |
| AC-003 (1 bottle → centered + 2 placeholders + upgrade copy) | TC-005-001-001 (P0), TC-005-001-003 | ✓ |
| AC-004 (gifted subtitle "Gifted from [name]") | TC-005-001-001 (P0), TC-005-001-004 | ✓ |
| AC-005 (delivery title "Recent and Upcoming Bottles") | TC-005-001-001 (P0), TC-005-001-005 | ✓ |
| AC-006 (list view tiles) | TC-005-001-001 (P0), TC-005-001-006 | ✓ |
| AC-007 (potential member view) | TC-005-001-001 (P0), TC-005-001-007 | ✓ |
| AC-008 (insiderGifting=true → button visible) | TC-005-001-001 (P0) | ✓ |
| AC-009 (in

