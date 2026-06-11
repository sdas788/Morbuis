---
id: TC-ROA-004-003-1
title: Step Down As Group Leader — Test Plan
category: e-004-group-leader-tools
scenario: Happy Path
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-004-003
  - e-004
created: '2026-05-26'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-004-003
  ac_index: 0
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-004-group-leader-tools/T-004-003-step-down-as-leader.md
  source_checksum: e64667d6c6713f27
---
## Steps
# Test Plan: Step Down As Group Leader

**ID:** T-004-003
**Story:** S-004-003
**Epic:** E-004
**Project:** roadscholar-mobile
**Created:** 2026-05-22
**Updated:** 2026-05-22
**Version:** 1.0

---

## Scope

Verifies the leader-initiated step-down flow on Group Leader Trips: menu affordance, two-option modal, step-down vs leave-group confirmation routing, in-flight UI states, error handling, single-group empty-state transition, and the cross-mutation verification (step-down calls `removeGroupLeaderStatus`, leave-group calls `removeUserFromGroup` — they must not be crossed).

## Prerequisites

- Two leader test accounts: `rs-test-leader-with-verint` (multi-group baseline, ≥2 leader groups) and `rs-test-leader-one-group` (exactly 1 leader group baseline)
- A participant test account that is a member of the same groups, used for the post-step-down "still a participant" verification
- Backend endpoint behind `useRemoveGroupLeaderStatusMutation` reachable in staging — confirm with dev team before run
- Ability to introduce a forced 500 error from the step-down endpoint (dev harness or feature flag) for TC-004-003-006
- Nightly teardown resets `rs-test-leader-with-verint` to ≥2 leader groups and `rs-test-leader-one-group` to exactly 1, per [qa-testplan.md teardown table](../../qa/qa-testplan.md#teardown--data-cleanup)

## AC Coverage Map

| AC | Test Cases | Priority |
|----|-----------|----------|
| AC-001 (TC-004-003-001) | TC-004-003-001 | P1 |
| AC-002 (TC-004-003-002) | TC-004-003-002 | P2 |
| AC-003 (TC-004-003-003) | TC-004-003-003 | P0 |
| AC-004 (TC-004-003-004) | TC-004-003-004 | P0 |
| AC-005 (TC-004-003-005) | TC-004-003-005 | P2 |
| AC-006 (TC-004-003-006) | TC-004-003-006 | P1 |
| AC-007 (TC-004-003-007) | TC-004-003-007 | P1 |
| AC-008 (TC-004-003-008) | TC-004-003-008 | P0 |
| AC-009 (TC-004-003-009) | TC-004-003-009 | P2 |

## Test Cases

### TC-004-003-001 — Menu affordance opens with both options

**Priority:** P1
**Type:** Functional
**Preconditions:**

## Expected Result
# Test Plan: Step Down As Group Leader

**ID:** T-004-003
**Story:** S-004-003
**Epic:** E-004
**Project:** roadscholar-mobile
**Created:** 2026-05-22
**Updated:** 2026-05-22
**Version:** 1.0

---

## Scope

Verifies the leader-initiated step-down flow on Group Leader Trips: menu affordance, two-option modal, step-down vs leave-group confirmation routing, in-flight UI states, error handling, single-group empty-state transition, and the cross-mutation verification (step-down calls `removeGroupLeaderStatus`, leave-group calls `removeUserFromGroup` — they must not be crossed).

## Prerequisites

- Two leader test accounts: `rs-test-leader-with-verint` (multi-group baseline, ≥2 leader groups) and `rs-test-leader-one-group` (exactly 1 leader group baseline)
- A participant test account that is a member of the same groups, used for the post-step-down "still a participant" verification
- Backend endpoint behind `useRemoveGroupLeaderStatusMutation` reachable in staging — confirm with dev team before run
- Ability to introduce a forced 500 error from the step-down endpoint (dev harness or feature flag) for TC-004-003-006
- Nightly teardown resets `rs-test-leader-with-verint` to ≥2 leader groups and `rs-test-leader-one-group` to exactly 1, per [qa-testplan.md teardown table](../../qa/qa-testplan.md#teardown--data-cleanup)

## AC Coverage Map

| AC | Test Cases | Priority |
|----|-----------|----------|
| AC-001 (TC-004-003-001) | TC-004-003-001 | P1 |
| AC-002 (TC-004-003-002) | TC-004-003-002 | P2 |
| AC-003 (TC-004-003-003) | TC-004-003-003 | P0 |
| AC-004 (TC-004-003-004) | TC-004-003-004 | P0 |
| AC-005 (TC-004-003-005) | TC-004-003-005 | P2 |
| AC-006 (TC-004-003-006) | TC-004-003-006 | P1 |
| AC-007 (TC-004-003-007) | TC-004-003-007 | P1 |
| AC-008 (TC-004-003-008) | TC-004-003-008 | P0 |
| AC-009 (TC-004-003-009) | TC-004-003-009 | P2 |

## Test Cases

### TC-004-003-001 — Menu affordance opens with both options

**Priority:** P1
**Type:** Functional
**Preconditions:**

