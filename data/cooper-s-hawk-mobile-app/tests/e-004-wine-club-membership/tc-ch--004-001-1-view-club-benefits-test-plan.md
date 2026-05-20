---
id: TC-CH--004-001-1
title: View Club Benefits — Test Plan
category: e-004-wine-club-membership
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-004-001
  - e-004
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-004-001
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-004-wine-club-membership/T-004-001-view-club-benefits.md
  source_checksum: abbe8e4e06645ae1
---
## Steps
# Test Plan: View Club Benefits

**ID:** T-004-001
**Project:** ch-mobile
**Story:** S-004-001
**Epic:** E-004
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

This test plan verifies that members and guests can navigate to the Club Benefits screen, view their current Wine Club tile (bottles, club type, benefit descriptions), expand and collapse benefit cards, see tier-comparison grey-outs (e.g. 1-bottle members see Monthly Wine Tastings greyed out), and see the correct status-based CTA (contextual Upgrade button for Active members, Rejoin Now for Inactive/Cancel, Upgrade Your Membership for gift members, no button for 3-bottle / New / Will Charge / UTP / Vacation Hold). It also covers the upgrade confirmation popup and the post-upgrade in-process messaging.

## Prerequisites

- Staging environment with seeded test members in each membership status (Active 1-bottle, Active 2-bottle, Active 3-bottle, Inactive, Cancel, New, Will Charge, UTP, Vacation Hold, Gift 3-month, Gift Bottles, Expired Gift)
- Each test member has a valid Card on File where required for upgrade
- `GET /membership/pricing` reachable from the app
- App is on a current build with the Account screen sub-navigation including "Club Benefits and Upgrades"

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (tile shows bottles + type + benefits) | TC-004-001-001 (P0) | ✓ |
| AC-002 (cards collapsed by default) | TC-004-001-001 (P0) | ✓ |
| AC-003 (tap expands title + description) | TC-004-001-001 (P0) | ✓ |
| AC-004 (1-bottle sees Monthly Wine Tastings greyed) | TC-004-001-001 (P0), TC-004-001-002 | ✓ |
| AC-005 (Active members see contextual upgrade text) | TC-004-001-001 (P0), TC-004-001-003 | ✓ |
| AC-006 (3-bottle sees no upgrade button) | TC-004-001-004 | ✓ |
| AC-007 (Inactive/Cancel see Rejoin Now) | TC-004-001-005 | ✓ |
| AC-008 (Gift members see Upgrade Your Membership) | TC-004-001-006 | ✓ |
| AC-009 (popup

## Expected Result
# Test Plan: View Club Benefits

**ID:** T-004-001
**Project:** ch-mobile
**Story:** S-004-001
**Epic:** E-004
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

This test plan verifies that members and guests can navigate to the Club Benefits screen, view their current Wine Club tile (bottles, club type, benefit descriptions), expand and collapse benefit cards, see tier-comparison grey-outs (e.g. 1-bottle members see Monthly Wine Tastings greyed out), and see the correct status-based CTA (contextual Upgrade button for Active members, Rejoin Now for Inactive/Cancel, Upgrade Your Membership for gift members, no button for 3-bottle / New / Will Charge / UTP / Vacation Hold). It also covers the upgrade confirmation popup and the post-upgrade in-process messaging.

## Prerequisites

- Staging environment with seeded test members in each membership status (Active 1-bottle, Active 2-bottle, Active 3-bottle, Inactive, Cancel, New, Will Charge, UTP, Vacation Hold, Gift 3-month, Gift Bottles, Expired Gift)
- Each test member has a valid Card on File where required for upgrade
- `GET /membership/pricing` reachable from the app
- App is on a current build with the Account screen sub-navigation including "Club Benefits and Upgrades"

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (tile shows bottles + type + benefits) | TC-004-001-001 (P0) | ✓ |
| AC-002 (cards collapsed by default) | TC-004-001-001 (P0) | ✓ |
| AC-003 (tap expands title + description) | TC-004-001-001 (P0) | ✓ |
| AC-004 (1-bottle sees Monthly Wine Tastings greyed) | TC-004-001-001 (P0), TC-004-001-002 | ✓ |
| AC-005 (Active members see contextual upgrade text) | TC-004-001-001 (P0), TC-004-001-003 | ✓ |
| AC-006 (3-bottle sees no upgrade button) | TC-004-001-004 | ✓ |
| AC-007 (Inactive/Cancel see Rejoin Now) | TC-004-001-005 | ✓ |
| AC-008 (Gift members see Upgrade Your Membership) | TC-004-001-006 | ✓ |
| AC-009 (popup

