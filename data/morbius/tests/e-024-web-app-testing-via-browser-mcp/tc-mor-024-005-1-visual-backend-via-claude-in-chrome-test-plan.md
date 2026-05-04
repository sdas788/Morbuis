---
id: TC-MOR-024-005-1
title: Visual Backend via Claude in Chrome — Test Plan
category: e-024-web-app-testing-via-browser-mcp
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-024-005
  - e-024
created: '2026-04-29'
updated: '2026-04-30'
pmagent_source:
  slug: morbius
  story_id: S-024-005
  ac_index: 0
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-024-web-app-testing/T-024-005-s-024-005-test-plan.md
  source_checksum: 06867f55c4a99049
---
## Steps
# Test Plan: Given a web-project test case is open in the TestDrawer When I click "

**ID:** T-024-005
**Project:** morbius
**Story:** S-024-005
**Epic:** E-024
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

> _Generated from Morbius test cases (E-023 publish-back). 3 test case(s) sourced from `morbius:S-024-005`._

---

## Scope

Verification of S-024-005 acceptance criteria. 3 test case(s) span the happy path plus negative and edge variations.

## Prerequisites

- (Inherit from story Prerequisites; fill in environment + data setup before authoring)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 | TC-024-005-001 (P0) | ✓ |
| AC-002 | TC-024-005-002 | ✓ |
| AC-003 | TC-024-005-003 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-024-005-001: Given a web-project test case is open in the TestDrawer When I click "

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

<!-- Morbius source: TC-MOR-024-005-1 (sourceChecksum=68571271d37f87d3) -->

**Preconditions:**
- (derived from story prerequisites — fill in or leave empty)

**Steps:**
1. a web-project test case is open in the TestDrawer
2. I click "Run visual"
3. the same `/api/test/run-web` endpoint is called with `mode: 'visual'`, which routes to `runAgentTask({mcps: ['claude-in-chrome'], ...})` — the agent opens a real Chrome tab and the user can watch each action

**Expected Result:**
Given a web-project test case is open in the TestDrawer When I click "Run visual" Then the same `/api/test/run-web` endpoint is called with `mode: 'visual'`, which routes to `runAgentTask({mcps: ['claude-in-chrome'], ...})` — the agent opens a real Chrome tab and the user can watch each action

**Failure Indicators:**
- (describe the wrong behavior; populate during real test authoring)

---

## Sub Flows

> All test cases beyond the core flow. Negative scenarios

## Expected Result
# Test Plan: Given a web-project test case is open in the TestDrawer When I click "

**ID:** T-024-005
**Project:** morbius
**Story:** S-024-005
**Epic:** E-024
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

> _Generated from Morbius test cases (E-023 publish-back). 3 test case(s) sourced from `morbius:S-024-005`._

---

## Scope

Verification of S-024-005 acceptance criteria. 3 test case(s) span the happy path plus negative and edge variations.

## Prerequisites

- (Inherit from story Prerequisites; fill in environment + data setup before authoring)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 | TC-024-005-001 (P0) | ✓ |
| AC-002 | TC-024-005-002 | ✓ |
| AC-003 | TC-024-005-003 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-024-005-001: Given a web-project test case is open in the TestDrawer When I click "

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

<!-- Morbius source: TC-MOR-024-005-1 (sourceChecksum=68571271d37f87d3) -->

**Preconditions:**
- (derived from story prerequisites — fill in or leave empty)

**Steps:**
1. a web-project test case is open in the TestDrawer
2. I click "Run visual"
3. the same `/api/test/run-web` endpoint is called with `mode: 'visual'`, which routes to `runAgentTask({mcps: ['claude-in-chrome'], ...})` — the agent opens a real Chrome tab and the user can watch each action

**Expected Result:**
Given a web-project test case is open in the TestDrawer When I click "Run visual" Then the same `/api/test/run-web` endpoint is called with `mode: 'visual'`, which routes to `runAgentTask({mcps: ['claude-in-chrome'], ...})` — the agent opens a real Chrome tab and the user can watch each action

**Failure Indicators:**
- (describe the wrong behavior; populate during real test authoring)

---

## Sub Flows

> All test cases beyond the core flow. Negative scenarios

