---
id: TC-CH--001-001-1
title: Guest Browsing — Test Plan
category: e-001-auth-onboarding
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-001-001
  - e-001
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-001-001
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-001-auth-onboarding/T-001-001-guest-browsing.md
  source_checksum: dca07c24901ff624
---
## Steps
# Test Plan: Guest Browsing

**ID:** T-001-001
**Project:** ch-mobile
**Story:** S-001-001
**Epic:** E-001
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Validate that an unauthenticated user can launch the app, see the Initial screen with three primary actions (Sign In, Create Account, Continue as Guest), choose Continue as Guest, and browse public surfaces (locations, location details, menus, public events) without an account. Member-only features must be intercepted with a sign-in/create-account prompt, and the user must be able to return to the auth flow without losing browsing context.

## Prerequisites

- A clean install of the app on a supported iOS device or simulator (no prior session in Keychain)
- Network connectivity to the staging environment
- At least one location, one menu, and one public event are seeded in the staging environment so guest content is browsable
- Reservations / Wine Club / Account screens are deployed (the gated surfaces under test)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (Initial screen shows three actions) | TC-001-001-001 (P0) | ✓ |
| AC-002 (Continue as Guest browses without auth) | TC-001-001-001 (P0) | ✓ |
| AC-003 (Member-only feature prompts sign-in) | TC-001-001-001 (P0) | ✓ |
| AC-004 (Return to auth flow without losing place) | TC-001-001-001 (P0) | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-001-001-001: Guest launches app, browses public content, gets prompted on a member-only feature, then returns to auth flow without losing place

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002, AC-003, AC-004
**Dependencies:** None

**Captures:**
| Label | Screen | State |
|-------|--------|-------|
| before | DS-initial | default |
| dashboard-as-guest | DS-dashboard | default |
| guest-prompt | DS-guest-user-modal | default |
| 

## Expected Result
# Test Plan: Guest Browsing

**ID:** T-001-001
**Project:** ch-mobile
**Story:** S-001-001
**Epic:** E-001
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Validate that an unauthenticated user can launch the app, see the Initial screen with three primary actions (Sign In, Create Account, Continue as Guest), choose Continue as Guest, and browse public surfaces (locations, location details, menus, public events) without an account. Member-only features must be intercepted with a sign-in/create-account prompt, and the user must be able to return to the auth flow without losing browsing context.

## Prerequisites

- A clean install of the app on a supported iOS device or simulator (no prior session in Keychain)
- Network connectivity to the staging environment
- At least one location, one menu, and one public event are seeded in the staging environment so guest content is browsable
- Reservations / Wine Club / Account screens are deployed (the gated surfaces under test)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (Initial screen shows three actions) | TC-001-001-001 (P0) | ✓ |
| AC-002 (Continue as Guest browses without auth) | TC-001-001-001 (P0) | ✓ |
| AC-003 (Member-only feature prompts sign-in) | TC-001-001-001 (P0) | ✓ |
| AC-004 (Return to auth flow without losing place) | TC-001-001-001 (P0) | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-001-001-001: Guest launches app, browses public content, gets prompted on a member-only feature, then returns to auth flow without losing place

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002, AC-003, AC-004
**Dependencies:** None

**Captures:**
| Label | Screen | State |
|-------|--------|-------|
| before | DS-initial | default |
| dashboard-as-guest | DS-dashboard | default |
| guest-prompt | DS-guest-user-modal | default |
| 

