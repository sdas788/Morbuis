---
id: TC-MOR-024-001-1
title: Project Type + WebUrl + Settings UI — Test Plan
category: e-024-web-app-testing-via-browser-mcp
scenario: Negative
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-024-001
  - e-024
created: '2026-04-29'
updated: '2026-04-30'
pmagent_source:
  slug: morbius
  story_id: S-024-001
  ac_index: 0
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-024-web-app-testing/T-024-001-s-024-001-test-plan.md
  source_checksum: 50bd015b1c05fe17
---
## Steps
# Test Plan: Given an existing Morbius project (e

**ID:** T-024-001
**Project:** morbius
**Story:** S-024-001
**Epic:** E-024
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

> _Generated from Morbius test cases (E-023 publish-back). 3 test case(s) sourced from `morbius:S-024-001`._

---

## Scope

Verification of S-024-001 acceptance criteria. 3 test case(s) span the happy path plus negative and edge variations.

## Prerequisites

- (Inherit from story Prerequisites; fill in environment + data setup before authoring)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 | TC-024-001-001 (P0) | ✓ |
| AC-002 | TC-024-001-002 | ✓ |
| AC-003 | TC-024-001-003 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-024-001-001: Given an existing Morbius project (e.g. micro-air) When I open Setting

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

<!-- Morbius source: TC-MOR-024-001-1 (sourceChecksum=d185f00baad30718) -->

**Preconditions:**
- (derived from story prerequisites — fill in or leave empty)

**Steps:**
1. an existing Morbius project (e.g. micro-air)
2. I open Settings → Workspace
3. I see a `projectType` dropdown defaulting to `mobile` and a `webUrl` input that surfaces only when `web` is selected, both saved via `POST /api/config/update`

**Expected Result:**
Given an existing Morbius project (e.g. micro-air) When I open Settings → Workspace Then I see a `projectType` dropdown defaulting to `mobile` and a `webUrl` input that surfaces only when `web` is selected, both saved via `POST /api/config/update`

**Failure Indicators:**
- (describe the wrong behavior; populate during real test authoring)

---

## Sub Flows

> All test cases beyond the core flow. Negative scenarios, edge cases, and regression guards.

### TC-024-001-002: Given a project's projectType is web When I look at the sidebar projec

## Expected Result
# Test Plan: Given an existing Morbius project (e

**ID:** T-024-001
**Project:** morbius
**Story:** S-024-001
**Epic:** E-024
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

> _Generated from Morbius test cases (E-023 publish-back). 3 test case(s) sourced from `morbius:S-024-001`._

---

## Scope

Verification of S-024-001 acceptance criteria. 3 test case(s) span the happy path plus negative and edge variations.

## Prerequisites

- (Inherit from story Prerequisites; fill in environment + data setup before authoring)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 | TC-024-001-001 (P0) | ✓ |
| AC-002 | TC-024-001-002 | ✓ |
| AC-003 | TC-024-001-003 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-024-001-001: Given an existing Morbius project (e.g. micro-air) When I open Setting

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

<!-- Morbius source: TC-MOR-024-001-1 (sourceChecksum=d185f00baad30718) -->

**Preconditions:**
- (derived from story prerequisites — fill in or leave empty)

**Steps:**
1. an existing Morbius project (e.g. micro-air)
2. I open Settings → Workspace
3. I see a `projectType` dropdown defaulting to `mobile` and a `webUrl` input that surfaces only when `web` is selected, both saved via `POST /api/config/update`

**Expected Result:**
Given an existing Morbius project (e.g. micro-air) When I open Settings → Workspace Then I see a `projectType` dropdown defaulting to `mobile` and a `webUrl` input that surfaces only when `web` is selected, both saved via `POST /api/config/update`

**Failure Indicators:**
- (describe the wrong behavior; populate during real test authoring)

---

## Sub Flows

> All test cases beyond the core flow. Negative scenarios, edge cases, and regression guards.

### TC-024-001-002: Given a project's projectType is web When I look at the sidebar projec

