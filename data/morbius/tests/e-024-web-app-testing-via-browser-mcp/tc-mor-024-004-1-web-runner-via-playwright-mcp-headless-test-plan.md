---
id: TC-MOR-024-004-1
title: Web Runner via Playwright MCP (Headless) — Test Plan
category: e-024-web-app-testing-via-browser-mcp
scenario: Negative
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-024-004
  - e-024
created: '2026-04-29'
updated: '2026-04-30'
pmagent_source:
  slug: morbius
  story_id: S-024-004
  ac_index: 0
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-024-web-app-testing/T-024-004-s-024-004-test-plan.md
  source_checksum: 8b3ed820ca4c7234
---
## Steps
# Test Plan: Given a project with projectType

**ID:** T-024-004
**Project:** morbius
**Story:** S-024-004
**Epic:** E-024
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

> _Generated from Morbius test cases (E-023 publish-back). 5 test case(s) sourced from `morbius:S-024-004`._

---

## Scope

Verification of S-024-004 acceptance criteria. 5 test case(s) span the happy path plus negative and edge variations.

## Prerequisites

- (Inherit from story Prerequisites; fill in environment + data setup before authoring)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 | TC-024-004-001 | ✓ |
| AC-002 | TC-024-004-002 | ✓ |
| AC-003 | TC-024-004-003 | ✓ |
| AC-004 | TC-024-004-004 | ✓ |
| AC-005 | TC-024-004-005 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-024-004-001: Given a project with projectType: 'web' and webUrl: '<url>' is active

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

<!-- Morbius source: TC-MOR-024-004-1 (sourceChecksum=b09004d18a8539f6) -->

**Preconditions:**
- (derived from story prerequisites — fill in or leave empty)

**Steps:**
1. a project with `projectType: 'web'` and `webUrl: '<url>'` is active
2. I `POST /api/test/run-web { testId }`
3. Morbius builds a prompt from the test case (title + steps + acceptance criteria + base URL), calls `runAgentTask({mcps: ['playwright-mcp'], prompt})`, parses structured JSON `{status, stepsExecuted, screenshots, error?}`, writes a `RunRecord` with `runner: 'web-headless'` + `targetUrl: '<url>'`, and returns `{ok, runId, status, screenshotCount}`

**Expected Result:**
Given a project with `projectType: 'web'` and `webUrl: '<url>'` is active When I `POST /api/test/run-web { testId }` Then Morbius builds a prompt from the test case (title + steps + acceptance criteria + base URL), calls `runAgentTask({mcps: ['playwright-mcp'], prompt})`

## Expected Result
# Test Plan: Given a project with projectType

**ID:** T-024-004
**Project:** morbius
**Story:** S-024-004
**Epic:** E-024
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

> _Generated from Morbius test cases (E-023 publish-back). 5 test case(s) sourced from `morbius:S-024-004`._

---

## Scope

Verification of S-024-004 acceptance criteria. 5 test case(s) span the happy path plus negative and edge variations.

## Prerequisites

- (Inherit from story Prerequisites; fill in environment + data setup before authoring)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 | TC-024-004-001 | ✓ |
| AC-002 | TC-024-004-002 | ✓ |
| AC-003 | TC-024-004-003 | ✓ |
| AC-004 | TC-024-004-004 | ✓ |
| AC-005 | TC-024-004-005 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-024-004-001: Given a project with projectType: 'web' and webUrl: '<url>' is active

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

<!-- Morbius source: TC-MOR-024-004-1 (sourceChecksum=b09004d18a8539f6) -->

**Preconditions:**
- (derived from story prerequisites — fill in or leave empty)

**Steps:**
1. a project with `projectType: 'web'` and `webUrl: '<url>'` is active
2. I `POST /api/test/run-web { testId }`
3. Morbius builds a prompt from the test case (title + steps + acceptance criteria + base URL), calls `runAgentTask({mcps: ['playwright-mcp'], prompt})`, parses structured JSON `{status, stepsExecuted, screenshots, error?}`, writes a `RunRecord` with `runner: 'web-headless'` + `targetUrl: '<url>'`, and returns `{ok, runId, status, screenshotCount}`

**Expected Result:**
Given a project with `projectType: 'web'` and `webUrl: '<url>'` is active When I `POST /api/test/run-web { testId }` Then Morbius builds a prompt from the test case (title + steps + acceptance criteria + base URL), calls `runAgentTask({mcps: ['playwright-mcp'], prompt})`

