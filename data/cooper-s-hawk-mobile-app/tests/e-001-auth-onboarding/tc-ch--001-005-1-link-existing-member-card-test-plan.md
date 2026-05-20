---
id: TC-CH--001-005-1
title: Link Existing Member Card — Test Plan
category: e-001-auth-onboarding
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-001-005
  - e-001
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-001-005
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-001-auth-onboarding/T-001-005-link-existing-member-card.md
  source_checksum: eb62eb517e82b318
---
## Steps
# Test Plan: Link Existing Member Card

**ID:** T-001-005
**Project:** ch-mobile
**Story:** S-001-005
**Epic:** E-001
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Validate that an authenticated member can navigate to the AddMemberCard screen, enter a numeric Wine Club card number, and link the card to their account via `GET /customer/lookup-unclaimed` (verification + name confirmation) followed by `POST /customer/claim` (link). Negative paths cover: card not found, card already claimed by another account, and the field's numeric-only input restriction.

## Prerequisites

- Authenticated test member `qa-card-link@chwinery.test` (logged in, no Wine Club card on file)
- Seeded card numbers in the staging Wine Club system:
  - `9990000001` — unclaimed, on file under "Unclaimed Tester One"
  - `9990000002` — already claimed by a different account
  - `0000000000` — known to not exist
- App is at the entry point for AddMemberCard (Account screen or onboarding handoff)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (Found unclaimed card → confirm name) | TC-001-005-001 (P0) | ✓ |
| AC-002 (Confirm match → claim + Wine Club update) | TC-001-005-001 (P0) | ✓ |
| AC-003 (Card not found → error) | TC-001-005-002 | ✓ |
| AC-004 (Already claimed → error + support) | TC-001-005-003 | ✓ |
| AC-005 (Numeric-only input) | TC-001-005-001 (P0), TC-001-005-004 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-001-005-001: Authenticated member finds and links an unclaimed Wine Club card; profile updates with Wine Club data

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002, AC-005
**Dependencies:** S-001-002 (Member Login) must be Done so the member can authenticate

**Captures:**
| Label | Screen | State |
|-------|--------|-------|
| before | DS-add-member-card | default |
| confirm-name | D

## Expected Result
# Test Plan: Link Existing Member Card

**ID:** T-001-005
**Project:** ch-mobile
**Story:** S-001-005
**Epic:** E-001
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Validate that an authenticated member can navigate to the AddMemberCard screen, enter a numeric Wine Club card number, and link the card to their account via `GET /customer/lookup-unclaimed` (verification + name confirmation) followed by `POST /customer/claim` (link). Negative paths cover: card not found, card already claimed by another account, and the field's numeric-only input restriction.

## Prerequisites

- Authenticated test member `qa-card-link@chwinery.test` (logged in, no Wine Club card on file)
- Seeded card numbers in the staging Wine Club system:
  - `9990000001` — unclaimed, on file under "Unclaimed Tester One"
  - `9990000002` — already claimed by a different account
  - `0000000000` — known to not exist
- App is at the entry point for AddMemberCard (Account screen or onboarding handoff)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (Found unclaimed card → confirm name) | TC-001-005-001 (P0) | ✓ |
| AC-002 (Confirm match → claim + Wine Club update) | TC-001-005-001 (P0) | ✓ |
| AC-003 (Card not found → error) | TC-001-005-002 | ✓ |
| AC-004 (Already claimed → error + support) | TC-001-005-003 | ✓ |
| AC-005 (Numeric-only input) | TC-001-005-001 (P0), TC-001-005-004 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-001-005-001: Authenticated member finds and links an unclaimed Wine Club card; profile updates with Wine Club data

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002, AC-005
**Dependencies:** S-001-002 (Member Login) must be Done so the member can authenticate

**Captures:**
| Label | Screen | State |
|-------|--------|-------|
| before | DS-add-member-card | default |
| confirm-name | D

