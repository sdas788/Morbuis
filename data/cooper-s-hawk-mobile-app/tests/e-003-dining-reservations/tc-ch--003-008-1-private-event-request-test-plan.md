---
id: TC-CH--003-008-1
title: Private Event Request — Test Plan
category: e-003-dining-reservations
scenario: Negative
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-003-008
  - e-003
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-003-008
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-003-dining-reservations/T-003-008-private-event-request.md
  source_checksum: b25f548a02744fe8
---
## Steps
# Test Plan: Private Event Request

**ID:** T-003-008
**Project:** ch-mobile
**Story:** S-003-008
**Epic:** E-003
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies that an authenticated member can submit a private-event lead inquiry via a slide-up modal launched from store details, the dashboard "More to Explore" section, or the events screen. Confirms profile pre-fill of contact fields, required-field inline validation, success and failure handling for `POST /private-event`, the in-flight submit-button disable behavior, and that guests are gated behind sign-in.

## Prerequisites

- Staging environment with `/private-event` reachable.
- Test member account M1 with a complete profile (first name, last name, email, phone) and preferred location LOC-A.
- Test member account M2 with no preferred location (and GPS enabled near LOC-A).
- Guest (unauthenticated) test session.
- Ability to switch `/private-event` to return 500 once for failure scenarios.
- Network online.

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (contact fields pre-filled from profile) | TC-003-008-001 (P0) | Yes |
| AC-002 (POST `/private-event` on Submit) | TC-003-008-001 (P0) | Yes |
| AC-003 (success → "follow up within 2 business days" copy) | TC-003-008-001 (P0) | Yes |
| AC-004 (missing required fields → inline errors) | TC-003-008-002 | Yes |
| AC-005 (failure → retry option) | TC-003-008-003 | Yes |
| AC-006 (guest user prompted to sign in) | TC-003-008-004 | Yes |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-003-008-001: Member submits a complete private-event request from store details and sees confirmation

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002, AC-003
**Dependencies:** None

**Captures:**
| Label | Screen | State |
|-------|--------|-------|
| before | DS-store-locator | default |

## Expected Result
# Test Plan: Private Event Request

**ID:** T-003-008
**Project:** ch-mobile
**Story:** S-003-008
**Epic:** E-003
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies that an authenticated member can submit a private-event lead inquiry via a slide-up modal launched from store details, the dashboard "More to Explore" section, or the events screen. Confirms profile pre-fill of contact fields, required-field inline validation, success and failure handling for `POST /private-event`, the in-flight submit-button disable behavior, and that guests are gated behind sign-in.

## Prerequisites

- Staging environment with `/private-event` reachable.
- Test member account M1 with a complete profile (first name, last name, email, phone) and preferred location LOC-A.
- Test member account M2 with no preferred location (and GPS enabled near LOC-A).
- Guest (unauthenticated) test session.
- Ability to switch `/private-event` to return 500 once for failure scenarios.
- Network online.

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (contact fields pre-filled from profile) | TC-003-008-001 (P0) | Yes |
| AC-002 (POST `/private-event` on Submit) | TC-003-008-001 (P0) | Yes |
| AC-003 (success → "follow up within 2 business days" copy) | TC-003-008-001 (P0) | Yes |
| AC-004 (missing required fields → inline errors) | TC-003-008-002 | Yes |
| AC-005 (failure → retry option) | TC-003-008-003 | Yes |
| AC-006 (guest user prompted to sign in) | TC-003-008-004 | Yes |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-003-008-001: Member submits a complete private-event request from store details and sees confirmation

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002, AC-003
**Dependencies:** None

**Captures:**
| Label | Screen | State |
|-------|--------|-------|
| before | DS-store-locator | default |

