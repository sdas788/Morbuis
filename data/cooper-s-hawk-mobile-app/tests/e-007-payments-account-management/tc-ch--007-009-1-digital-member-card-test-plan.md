---
id: TC-CH--007-009-1
title: Digital Member Card — Test Plan
category: e-007-payments-account-management
scenario: Negative
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-007-009
  - e-007
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-007-009
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-007-payments-account-management/T-007-009-digital-member-card.md
  source_checksum: 828cbf4ace5bc945
---
## Steps
# Test Plan: Digital Member Card

**ID:** T-007-009
**Project:** ch-mobile
**Story:** S-007-009
**Epic:** E-007
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies the `MemberCard` component renders on the Account screen (within `MultiMembership`) and on Wine Wallet with the full set of fields (member name, member type, member number, variety, club type) regardless of membership status, that Ambassador-type members display the correct member type label, and that tapping the Account tab three times triggers the in-app review prompt.

## Prerequisites

- Test member accounts for: Standard Member, Ambassador, Ambassador Elite, Invited/Gift variants
- Stagable customer payload with all five card fields populated
- Build configured to allow the in-app review prompt to surface (Apple `SKStoreReviewController` / Google In-App Review APIs may rate-limit in production)
- App authenticated to each account in turn

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (card renders with name, member type, member number, variety, club type) | TC-007-009-001 (P0), TC-007-009-002 | ✓ |
| AC-002 (Ambassador member type label) | TC-007-009-001 (P0), TC-007-009-003 | ✓ |
| AC-003 (3 taps on Account tab → in-app review prompt) | TC-007-009-001 (P0), TC-007-009-004 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-007-009-001: Member views the digital card on Account and Wine Wallet, switches to an Ambassador account, and triggers the in-app review prompt with three taps

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002, AC-003
**Dependencies:** None

**Captures:**
| Label | Screen | State |
|-------|--------|-------|
| before | DS-account | default |
| account-card | DS-account-member-card | default |
| wine-wallet-card | DS-account-member-card | wine-wallet |
| ambassador-card | DS-account-memb

## Expected Result
# Test Plan: Digital Member Card

**ID:** T-007-009
**Project:** ch-mobile
**Story:** S-007-009
**Epic:** E-007
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies the `MemberCard` component renders on the Account screen (within `MultiMembership`) and on Wine Wallet with the full set of fields (member name, member type, member number, variety, club type) regardless of membership status, that Ambassador-type members display the correct member type label, and that tapping the Account tab three times triggers the in-app review prompt.

## Prerequisites

- Test member accounts for: Standard Member, Ambassador, Ambassador Elite, Invited/Gift variants
- Stagable customer payload with all five card fields populated
- Build configured to allow the in-app review prompt to surface (Apple `SKStoreReviewController` / Google In-App Review APIs may rate-limit in production)
- App authenticated to each account in turn

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (card renders with name, member type, member number, variety, club type) | TC-007-009-001 (P0), TC-007-009-002 | ✓ |
| AC-002 (Ambassador member type label) | TC-007-009-001 (P0), TC-007-009-003 | ✓ |
| AC-003 (3 taps on Account tab → in-app review prompt) | TC-007-009-001 (P0), TC-007-009-004 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-007-009-001: Member views the digital card on Account and Wine Wallet, switches to an Ambassador account, and triggers the in-app review prompt with three taps

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002, AC-003
**Dependencies:** None

**Captures:**
| Label | Screen | State |
|-------|--------|-------|
| before | DS-account | default |
| account-card | DS-account-member-card | default |
| wine-wallet-card | DS-account-member-card | wine-wallet |
| ambassador-card | DS-account-memb

