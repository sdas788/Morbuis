---
id: TC-CH--002-001-1
title: Store Locator — Test Plan
category: e-002-location-discovery
scenario: Negative
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-002-001
  - e-002
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-002-001
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-002-location-discovery/T-002-001-store-locator.md
  source_checksum: 57704228ee3d062b
---
## Steps
# Test Plan: Store Locator

**ID:** T-002-001
**Project:** ch-mobile
**Story:** S-002-001
**Epic:** E-002
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

This plan verifies that a guest user can discover Cooper's Hawk locations via a map-based store locator. Coverage includes the default list view sorted by distance, map view with horizontal scrolling cards and gold/black pin behavior, search by zip/city/state with Google Place autocomplete, "Search Here" pan-to-research behavior, geolocation indicators (blue dot and compass), the no-permission empty-state messaging, and navigation to Location Details via the info icon.

## Prerequisites

- Build of the CH mobile app installed on a simulator/device with network access.
- OLO API and Enterprise service layer reachable from the test environment.
- Google Maps SDK key configured and Place Search autocomplete enabled.
- At least one Cooper's Hawk location seeded within ~25 miles of the simulated GPS coordinates so distance sorting is exercised.
- A second cluster of locations near a known city/zip (e.g., Chicago / 60601) so search results return.
- Device location services controllable (toggle on/off) at the OS level.

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (list sorted by distance, closest first) | TC-002-001-001 (P0) | ✓ |
| AC-002 (permission denied empty-state message) | TC-002-001-001 (P0), TC-002-001-002 | ✓ |
| AC-003 (map view: horizontal cards, gold pin for current card) | TC-002-001-001 (P0), TC-002-001-003 | ✓ |
| AC-004 ("Search Here" appears after pan outside search area) | TC-002-001-001 (P0), TC-002-001-004 | ✓ |
| AC-005 (search by city/zip updates list and map sorted by search location) | TC-002-001-001 (P0), TC-002-001-005 | ✓ |
| AC-006 (info icon navigates to Location Details) | TC-002-001-001 (P0), TC-002-001-006 | ✓ |
| AC-007 (location services on shows blue dot + compass) | TC-002-001-001 (P0), TC

## Expected Result
# Test Plan: Store Locator

**ID:** T-002-001
**Project:** ch-mobile
**Story:** S-002-001
**Epic:** E-002
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

This plan verifies that a guest user can discover Cooper's Hawk locations via a map-based store locator. Coverage includes the default list view sorted by distance, map view with horizontal scrolling cards and gold/black pin behavior, search by zip/city/state with Google Place autocomplete, "Search Here" pan-to-research behavior, geolocation indicators (blue dot and compass), the no-permission empty-state messaging, and navigation to Location Details via the info icon.

## Prerequisites

- Build of the CH mobile app installed on a simulator/device with network access.
- OLO API and Enterprise service layer reachable from the test environment.
- Google Maps SDK key configured and Place Search autocomplete enabled.
- At least one Cooper's Hawk location seeded within ~25 miles of the simulated GPS coordinates so distance sorting is exercised.
- A second cluster of locations near a known city/zip (e.g., Chicago / 60601) so search results return.
- Device location services controllable (toggle on/off) at the OS level.

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (list sorted by distance, closest first) | TC-002-001-001 (P0) | ✓ |
| AC-002 (permission denied empty-state message) | TC-002-001-001 (P0), TC-002-001-002 | ✓ |
| AC-003 (map view: horizontal cards, gold pin for current card) | TC-002-001-001 (P0), TC-002-001-003 | ✓ |
| AC-004 ("Search Here" appears after pan outside search area) | TC-002-001-001 (P0), TC-002-001-004 | ✓ |
| AC-005 (search by city/zip updates list and map sorted by search location) | TC-002-001-001 (P0), TC-002-001-005 | ✓ |
| AC-006 (info icon navigates to Location Details) | TC-002-001-001 (P0), TC-002-001-006 | ✓ |
| AC-007 (location services on shows blue dot + compass) | TC-002-001-001 (P0), TC

