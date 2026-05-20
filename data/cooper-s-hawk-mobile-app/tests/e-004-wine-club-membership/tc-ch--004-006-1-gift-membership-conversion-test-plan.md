---
id: TC-CH--004-006-1
title: Gift Membership Conversion — Test Plan
category: e-004-wine-club-membership
scenario: Negative
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-004-006
  - e-004
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-004-006
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-004-wine-club-membership/T-004-006-gift-membership-conversion.md
  source_checksum: 11ddd9f707a5871b
---
## Steps
# Test Plan: Gift Membership Conversion

**ID:** T-004-006
**Project:** ch-mobile
**Story:** S-004-006
**Epic:** E-004
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

This test plan verifies that gift-membership holders (active or expired) can convert to a paid monthly membership via the "Upgrade Your Membership" entry points on the Account and Club Benefits screens. It checks that the conversion reuses the Wine Club Selection (S-004-002) flow, that an existing card on file is pre-selected at payment, that successful conversion changes the membership type from Gift to Monthly with the in-process confirmation message, that the upgrade button is correctly hidden for gift statuses New/Will Charge/UTP/Vacation Hold, and that expired gift memberships remain eligible to convert.

## Prerequisites

- Staging environment with seeded gift-membership users covering each scenario:
  - Active 3-month gift membership with Card on File
  - Active 6-month gift membership without Card on File
  - Expired gift membership (>30 days past expiration)
  - Recently expired gift membership (within 30 days)
  - Gift in New, Will Charge, UTP, and Vacation Hold statuses
  - Multi-membership user with one gift and one monthly membership (different member numbers)
- BluePay sandbox configured with a known test card
- Wine Club Selection flow (S-004-002) is Done and reachable

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (Active gift sees Upgrade Your Membership; routes to Wine Club Selection) | TC-004-006-001 (P0) | ✓ |
| AC-002 (Successful conversion changes type to Monthly + refresh + confirmation text) | TC-004-006-001 (P0) | ✓ |
| AC-003 (New/Will Charge/UTP/Vacation Hold gift sees no upgrade button) | TC-004-006-002 | ✓ |
| AC-004 (COF from gift membership pre-selected at payment) | TC-004-006-001 (P0), TC-004-006-003 | ✓ |
| AC-005 (Expired gift can complete conversion and regain benefits) | TC

## Expected Result
# Test Plan: Gift Membership Conversion

**ID:** T-004-006
**Project:** ch-mobile
**Story:** S-004-006
**Epic:** E-004
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

This test plan verifies that gift-membership holders (active or expired) can convert to a paid monthly membership via the "Upgrade Your Membership" entry points on the Account and Club Benefits screens. It checks that the conversion reuses the Wine Club Selection (S-004-002) flow, that an existing card on file is pre-selected at payment, that successful conversion changes the membership type from Gift to Monthly with the in-process confirmation message, that the upgrade button is correctly hidden for gift statuses New/Will Charge/UTP/Vacation Hold, and that expired gift memberships remain eligible to convert.

## Prerequisites

- Staging environment with seeded gift-membership users covering each scenario:
  - Active 3-month gift membership with Card on File
  - Active 6-month gift membership without Card on File
  - Expired gift membership (>30 days past expiration)
  - Recently expired gift membership (within 30 days)
  - Gift in New, Will Charge, UTP, and Vacation Hold statuses
  - Multi-membership user with one gift and one monthly membership (different member numbers)
- BluePay sandbox configured with a known test card
- Wine Club Selection flow (S-004-002) is Done and reachable

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (Active gift sees Upgrade Your Membership; routes to Wine Club Selection) | TC-004-006-001 (P0) | ✓ |
| AC-002 (Successful conversion changes type to Monthly + refresh + confirmation text) | TC-004-006-001 (P0) | ✓ |
| AC-003 (New/Will Charge/UTP/Vacation Hold gift sees no upgrade button) | TC-004-006-002 | ✓ |
| AC-004 (COF from gift membership pre-selected at payment) | TC-004-006-001 (P0), TC-004-006-003 | ✓ |
| AC-005 (Expired gift can complete conversion and regain benefits) | TC

