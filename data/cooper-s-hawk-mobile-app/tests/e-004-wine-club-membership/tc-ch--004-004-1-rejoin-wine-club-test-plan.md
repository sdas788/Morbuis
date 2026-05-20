---
id: TC-CH--004-004-1
title: Rejoin Wine Club — Test Plan
category: e-004-wine-club-membership
scenario: Negative
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-004-004
  - e-004
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-004-004
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-004-wine-club-membership/T-004-004-rejoin-wine-club.md
  source_checksum: 2ad474266bce8a43
---
## Steps
# Test Plan: Rejoin Wine Club

**ID:** T-004-004
**Project:** ch-mobile
**Story:** S-004-004
**Epic:** E-004
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

This test plan verifies the Rejoin Wine Club experience for lapsed members: visibility of the "Rejoin Now" button on Club Benefits and below the points chart for Inactive/Cancel members; routing into the Wine Club Edit function; the rejoin payment flow that calls `POST /membership/monthly/charge/rejoin`; the welcome confirmation including restored tier and next billing date; inline error handling on payment failure; the differentiated Upgrade button for gift members; the absence of any rejoin/upgrade button for New/Will Charge/UTP/Vacation Hold; and that dismissing the rejoin flow leaves the user with guest-level access.

## Prerequisites

- Staging environment with seeded members in Inactive, Cancel, gift (3-6-9 month and Gifted Bottles), New, Will Charge, UTP, and Vacation Hold statuses
- Each lapsed member has a previous tier on record so the rejoin flow can default
- API stubs reachable for `POST /membership/monthly/charge/rejoin` plus a 4xx variant for the failure path
- Member-only feature route available so the contextual rejoin modal can be triggered
- Test card (BluePay sandbox) for the payment confirmation step

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (Inactive/Cancel sees Rejoin Now on Club Benefits) | TC-004-004-001 (P0) | ✓ |
| AC-002 (Inactive/Cancel sees Rejoin Now below points chart) | TC-004-004-001 (P0), TC-004-004-002 | ✓ |
| AC-003 (Tap Rejoin Now routes to Wine Club Edit) | TC-004-004-001 (P0) | ✓ |
| AC-004 (Successful rejoin shows confirmation) | TC-004-004-001 (P0) | ✓ |
| AC-005 (Payment error shows inline message, form editable) | TC-004-004-003 | ✓ |
| AC-006 (Gift member sees Upgrade Your Membership) | TC-004-004-004 | ✓ |
| AC-007 (New/Will Charge/UTP/Vacation Hold see no rejoin/upgrad

## Expected Result
# Test Plan: Rejoin Wine Club

**ID:** T-004-004
**Project:** ch-mobile
**Story:** S-004-004
**Epic:** E-004
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

This test plan verifies the Rejoin Wine Club experience for lapsed members: visibility of the "Rejoin Now" button on Club Benefits and below the points chart for Inactive/Cancel members; routing into the Wine Club Edit function; the rejoin payment flow that calls `POST /membership/monthly/charge/rejoin`; the welcome confirmation including restored tier and next billing date; inline error handling on payment failure; the differentiated Upgrade button for gift members; the absence of any rejoin/upgrade button for New/Will Charge/UTP/Vacation Hold; and that dismissing the rejoin flow leaves the user with guest-level access.

## Prerequisites

- Staging environment with seeded members in Inactive, Cancel, gift (3-6-9 month and Gifted Bottles), New, Will Charge, UTP, and Vacation Hold statuses
- Each lapsed member has a previous tier on record so the rejoin flow can default
- API stubs reachable for `POST /membership/monthly/charge/rejoin` plus a 4xx variant for the failure path
- Member-only feature route available so the contextual rejoin modal can be triggered
- Test card (BluePay sandbox) for the payment confirmation step

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (Inactive/Cancel sees Rejoin Now on Club Benefits) | TC-004-004-001 (P0) | ✓ |
| AC-002 (Inactive/Cancel sees Rejoin Now below points chart) | TC-004-004-001 (P0), TC-004-004-002 | ✓ |
| AC-003 (Tap Rejoin Now routes to Wine Club Edit) | TC-004-004-001 (P0) | ✓ |
| AC-004 (Successful rejoin shows confirmation) | TC-004-004-001 (P0) | ✓ |
| AC-005 (Payment error shows inline message, form editable) | TC-004-004-003 | ✓ |
| AC-006 (Gift member sees Upgrade Your Membership) | TC-004-004-004 | ✓ |
| AC-007 (New/Will Charge/UTP/Vacation Hold see no rejoin/upgrad

