---
id: TC-CH--003-004-1
title: Touchless Menu — Test Plan
category: e-003-dining-reservations
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-003-004
  - e-003
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-003-004
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-003-dining-reservations/T-003-004-touchless-menu.md
  source_checksum: eebd7e2f42f8e3f6
---
## Steps
# Test Plan: Touchless Menu

**ID:** T-003-004
**Project:** ch-mobile
**Story:** S-003-004
**Epic:** E-003
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies that any user (guest or member) can browse the location-specific food and wine menu via category navigation, sub-category dropdowns with anchor scroll, and item detail popups (image, description, modifiers, suggested pairing). Confirms QR-code deep-link entry, location-change reload via InlineLocator, loading and error states, and the conditional rendering for the "Our Wines" category on Android.

## Prerequisites

- Staging environment with `/menu` reachable.
- Two test locations LOC-A and LOC-B with distinct menu data.
- Test data: at least one category with multiple subcategories (e.g., "Our Wines" with "Red", "White", "Sparkling"); at least one item with an image, modifiers, and suggested pairing data; at least one item with no modifiers; at least one item with no suggested pairing.
- Pre-published test QR code resolving to `/menu` deep link for LOC-A.
- Both iOS and Android devices/simulators available.
- Network online for happy paths; ability to simulate offline / 5xx for error states.

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (categories listed in API order with arrows) | TC-003-004-001 (P0) | Yes |
| AC-002 (item list shows title/description/price) | TC-003-004-001 (P0) | Yes |
| AC-003 (subcategory dropdown defaulted to "All", section headers) | TC-003-004-001 (P0) | Yes |
| AC-004 (selecting subcategory scrolls to section, others remain) | TC-003-004-001 (P0), TC-003-004-002 | Yes |
| AC-005 (detail popup shows image, modifiers, pairing) | TC-003-004-001 (P0) | Yes |
| AC-006 (no modifiers → modifiers section hidden) | TC-003-004-003 | Yes |
| AC-007 (no pairing → pairing section hidden) | TC-003-004-004 | Yes |
| AC-008 (QR deep link opens menu in-app for correct location) | TC-003-004-005 | Yes 

## Expected Result
# Test Plan: Touchless Menu

**ID:** T-003-004
**Project:** ch-mobile
**Story:** S-003-004
**Epic:** E-003
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies that any user (guest or member) can browse the location-specific food and wine menu via category navigation, sub-category dropdowns with anchor scroll, and item detail popups (image, description, modifiers, suggested pairing). Confirms QR-code deep-link entry, location-change reload via InlineLocator, loading and error states, and the conditional rendering for the "Our Wines" category on Android.

## Prerequisites

- Staging environment with `/menu` reachable.
- Two test locations LOC-A and LOC-B with distinct menu data.
- Test data: at least one category with multiple subcategories (e.g., "Our Wines" with "Red", "White", "Sparkling"); at least one item with an image, modifiers, and suggested pairing data; at least one item with no modifiers; at least one item with no suggested pairing.
- Pre-published test QR code resolving to `/menu` deep link for LOC-A.
- Both iOS and Android devices/simulators available.
- Network online for happy paths; ability to simulate offline / 5xx for error states.

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (categories listed in API order with arrows) | TC-003-004-001 (P0) | Yes |
| AC-002 (item list shows title/description/price) | TC-003-004-001 (P0) | Yes |
| AC-003 (subcategory dropdown defaulted to "All", section headers) | TC-003-004-001 (P0) | Yes |
| AC-004 (selecting subcategory scrolls to section, others remain) | TC-003-004-001 (P0), TC-003-004-002 | Yes |
| AC-005 (detail popup shows image, modifiers, pairing) | TC-003-004-001 (P0) | Yes |
| AC-006 (no modifiers → modifiers section hidden) | TC-003-004-003 | Yes |
| AC-007 (no pairing → pairing section hidden) | TC-003-004-004 | Yes |
| AC-008 (QR deep link opens menu in-app for correct location) | TC-003-004-005 | Yes 

