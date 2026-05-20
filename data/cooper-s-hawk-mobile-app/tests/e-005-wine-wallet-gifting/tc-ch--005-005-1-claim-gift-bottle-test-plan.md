---
id: TC-CH--005-005-1
title: Claim Gift Bottle — Test Plan
category: e-005-wine-wallet-gifting
scenario: Edge Case
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-005-005
  - e-005
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-005-005
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-005-wine-wallet-gifting/T-005-005-claim-gift-bottle.md
  source_checksum: e55a949d00522de8
---
## Steps
# Test Plan: Claim Gift Bottle

**ID:** T-005-005
**Project:** ch-mobile
**Story:** S-005-005
**Epic:** E-005
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies the gift-claim experience for both non-member (potential member) and existing-member recipients. Covers the welcome-email-driven first login, forced password creation, the gift alert popup with link to the wine wallet, the "?" placeholder bottle rendering with restaurant-only / pickup-only language, the suppression of gifted bottles from history until physical pickup, the gift indicator for member recipients, the deep-link routing (app installed vs not installed → app store), and the "I received a Gift Bottle" section gating via the `insiderGifting` flag.

## Prerequisites

- A pending gift created via S-005-004 against a non-member email address (potential member account A)
- A pending gift created against an existing member account (Account B)
- A welcome email containing temporary credentials and a deep link, captured from the gifting send-step's email pipeline
- Devices: one with the app installed (for installed-deep-link path) and one without (for app store fallback)
- The `insiderGifting` API flag controllable per account
- `POST /membership/gift/activate` reachable

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (forced password on first login) | TC-005-005-001 (P0) | ✓ |
| AC-002 (gift popup with link to wallet) | TC-005-005-001 (P0) | ✓ |
| AC-003 ("?" placeholder image in wallet) | TC-005-005-001 (P0), TC-005-005-002 | ✓ |
| AC-004 (restaurant-only / pickup language) | TC-005-005-001 (P0), TC-005-005-003 | ✓ |
| AC-005 (gifted bottle hidden from history pre-pickup) | TC-005-005-004 | ✓ |
| AC-006 (member recipient sees gift indicator) | TC-005-005-005 | ✓ |
| AC-007 (potential member with insiderGifting → "I received a Gift Bottle" section) | TC-005-005-006 | ✓ |

---

## Core Test Flow

> P0 — exactl

## Expected Result
# Test Plan: Claim Gift Bottle

**ID:** T-005-005
**Project:** ch-mobile
**Story:** S-005-005
**Epic:** E-005
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies the gift-claim experience for both non-member (potential member) and existing-member recipients. Covers the welcome-email-driven first login, forced password creation, the gift alert popup with link to the wine wallet, the "?" placeholder bottle rendering with restaurant-only / pickup-only language, the suppression of gifted bottles from history until physical pickup, the gift indicator for member recipients, the deep-link routing (app installed vs not installed → app store), and the "I received a Gift Bottle" section gating via the `insiderGifting` flag.

## Prerequisites

- A pending gift created via S-005-004 against a non-member email address (potential member account A)
- A pending gift created against an existing member account (Account B)
- A welcome email containing temporary credentials and a deep link, captured from the gifting send-step's email pipeline
- Devices: one with the app installed (for installed-deep-link path) and one without (for app store fallback)
- The `insiderGifting` API flag controllable per account
- `POST /membership/gift/activate` reachable

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (forced password on first login) | TC-005-005-001 (P0) | ✓ |
| AC-002 (gift popup with link to wallet) | TC-005-005-001 (P0) | ✓ |
| AC-003 ("?" placeholder image in wallet) | TC-005-005-001 (P0), TC-005-005-002 | ✓ |
| AC-004 (restaurant-only / pickup language) | TC-005-005-001 (P0), TC-005-005-003 | ✓ |
| AC-005 (gifted bottle hidden from history pre-pickup) | TC-005-005-004 | ✓ |
| AC-006 (member recipient sees gift indicator) | TC-005-005-005 | ✓ |
| AC-007 (potential member with insiderGifting → "I received a Gift Bottle" section) | TC-005-005-006 | ✓ |

---

## Core Test Flow

> P0 — exactl

