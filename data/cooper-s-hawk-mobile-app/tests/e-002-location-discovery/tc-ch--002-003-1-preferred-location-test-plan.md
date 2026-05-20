---
id: TC-CH--002-003-1
title: Preferred Location — Test Plan
category: e-002-location-discovery
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-002-003
  - e-002
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-002-003
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-002-location-discovery/T-002-003-preferred-location.md
  source_checksum: 31483e1e9e54cd9a
---
## Steps
# Test Plan: Preferred Location

**ID:** T-002-003
**Project:** ch-mobile
**Story:** S-002-003
**Epic:** E-002
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

This plan verifies that members can set, replace, and view a preferred Cooper's Hawk location. Coverage includes the heart-icon confirmation pop-up with Save / Cancel / X behavior, persistence of the preferred location to the customer profile, automatic replacement when a new location is chosen, the "Preferred" section header in the store locator (with "Order Online" and "Make Reservation" quick actions), the empty-state message when no preferred is set, dashboard surfacing of the preferred location and its quick actions, and that guest users do not see the heart icon at all.

## Prerequisites

- App build with the Store Locator (S-002-001) and Location Details (S-002-002) reachable.
- A test member account with no preferred location set at the start of the run; ability to reset the customer profile back to "no preferred" between runs (DELETE endpoint or admin action).
- A second test member account with an existing preferred location — used to validate the replacement flow.
- A guest (logged out) state to verify the heart icon is hidden.
- Network online; `POST /customer/preferred-location` and `DELETE /customer/preferred-location` reachable.

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (heart tap shows confirmation with exact copy + Save/Cancel) | TC-002-003-001 (P0), TC-002-003-002 | ✓ |
| AC-002 (Save sets preferred and shows it in Preferred section) | TC-002-003-001 (P0) | ✓ |
| AC-003 (Cancel makes no changes) | TC-002-003-001 (P0), TC-002-003-003 | ✓ |
| AC-004 (new preferred replaces previous) | TC-002-003-001 (P0), TC-002-003-004 | ✓ |
| AC-005 (no preferred → empty-state message in locator) | TC-002-003-001 (P0), TC-002-003-005 | ✓ |
| AC-006 (Dashboard shows preferred name + quick actions) | TC-002-003-00

## Expected Result
# Test Plan: Preferred Location

**ID:** T-002-003
**Project:** ch-mobile
**Story:** S-002-003
**Epic:** E-002
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

This plan verifies that members can set, replace, and view a preferred Cooper's Hawk location. Coverage includes the heart-icon confirmation pop-up with Save / Cancel / X behavior, persistence of the preferred location to the customer profile, automatic replacement when a new location is chosen, the "Preferred" section header in the store locator (with "Order Online" and "Make Reservation" quick actions), the empty-state message when no preferred is set, dashboard surfacing of the preferred location and its quick actions, and that guest users do not see the heart icon at all.

## Prerequisites

- App build with the Store Locator (S-002-001) and Location Details (S-002-002) reachable.
- A test member account with no preferred location set at the start of the run; ability to reset the customer profile back to "no preferred" between runs (DELETE endpoint or admin action).
- A second test member account with an existing preferred location — used to validate the replacement flow.
- A guest (logged out) state to verify the heart icon is hidden.
- Network online; `POST /customer/preferred-location` and `DELETE /customer/preferred-location` reachable.

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (heart tap shows confirmation with exact copy + Save/Cancel) | TC-002-003-001 (P0), TC-002-003-002 | ✓ |
| AC-002 (Save sets preferred and shows it in Preferred section) | TC-002-003-001 (P0) | ✓ |
| AC-003 (Cancel makes no changes) | TC-002-003-001 (P0), TC-002-003-003 | ✓ |
| AC-004 (new preferred replaces previous) | TC-002-003-001 (P0), TC-002-003-004 | ✓ |
| AC-005 (no preferred → empty-state message in locator) | TC-002-003-001 (P0), TC-002-003-005 | ✓ |
| AC-006 (Dashboard shows preferred name + quick actions) | TC-002-003-00

