---
id: TC-CH--002-002-1
title: Location Details — Test Plan
category: e-002-location-discovery
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-002-002
  - e-002
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-002-002
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-002-location-discovery/T-002-002-location-details.md
  source_checksum: 82678f679867c4ec
---
## Steps
# Test Plan: Location Details

**ID:** T-002-002
**Project:** ch-mobile
**Story:** S-002-002
**Epic:** E-002
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

This plan verifies that a guest or member can open a location's full detail screen and act on every surfaced piece of information. Coverage includes the slide-up toast presentation with blurred background, the hours block with "See more" expansion, dynamic Additional Hours blocks from Craft CMS (and their hide-when-empty behavior), the photo carousel and its hide-when-empty behavior, the native share sheet, click-to-call, directions handoff to the device map app, the Book an Event tile, member vs non-member behavior on event tiles, and integration buttons for online ordering and reservations.

## Prerequisites

- App build with the Location Details screen reachable from the Store Locator (S-002-001 Done).
- Two seeded test locations:
  - **Location A** — has Additional Hours (Happy Hour + Brunch), at least 3 photos, at least 1 upcoming event, full address, phone, and website URL.
  - **Location B** — has no Additional Hours, no photos, and no upcoming events (covers hide-when-empty paths).
- A test member account (logged in for member-flow tests) and the ability to test as a guest (logged out for non-member-flow tests).
- Device permissions for the native share sheet, phone dialer, and default mapping app.
- Network online; Enterprise Service Layer endpoint serving Additional Hours from Craft CMS reachable.

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (toast slides up with blurred background) | TC-002-002-001 (P0) | ✓ |
| AC-002 (today + tomorrow hours, "See more" expand) | TC-002-002-001 (P0), TC-002-002-002 | ✓ |
| AC-003 (additional hours render in API order with headings, text, hours, CTA) | TC-002-002-001 (P0), TC-002-002-003 | ✓ |
| AC-004 (no additional hours → section hidden) | TC-002-002-001 (P0), TC-002-002-

## Expected Result
# Test Plan: Location Details

**ID:** T-002-002
**Project:** ch-mobile
**Story:** S-002-002
**Epic:** E-002
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

This plan verifies that a guest or member can open a location's full detail screen and act on every surfaced piece of information. Coverage includes the slide-up toast presentation with blurred background, the hours block with "See more" expansion, dynamic Additional Hours blocks from Craft CMS (and their hide-when-empty behavior), the photo carousel and its hide-when-empty behavior, the native share sheet, click-to-call, directions handoff to the device map app, the Book an Event tile, member vs non-member behavior on event tiles, and integration buttons for online ordering and reservations.

## Prerequisites

- App build with the Location Details screen reachable from the Store Locator (S-002-001 Done).
- Two seeded test locations:
  - **Location A** — has Additional Hours (Happy Hour + Brunch), at least 3 photos, at least 1 upcoming event, full address, phone, and website URL.
  - **Location B** — has no Additional Hours, no photos, and no upcoming events (covers hide-when-empty paths).
- A test member account (logged in for member-flow tests) and the ability to test as a guest (logged out for non-member-flow tests).
- Device permissions for the native share sheet, phone dialer, and default mapping app.
- Network online; Enterprise Service Layer endpoint serving Additional Hours from Craft CMS reachable.

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (toast slides up with blurred background) | TC-002-002-001 (P0) | ✓ |
| AC-002 (today + tomorrow hours, "See more" expand) | TC-002-002-001 (P0), TC-002-002-002 | ✓ |
| AC-003 (additional hours render in API order with headings, text, hours, CTA) | TC-002-002-001 (P0), TC-002-002-003 | ✓ |
| AC-004 (no additional hours → section hidden) | TC-002-002-001 (P0), TC-002-002-

