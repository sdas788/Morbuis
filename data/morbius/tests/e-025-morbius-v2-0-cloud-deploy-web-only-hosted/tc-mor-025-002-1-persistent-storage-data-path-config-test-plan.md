---
id: TC-MOR-025-002-1
title: Persistent Storage + Data Path Config — Test Plan
category: e-025-morbius-v2-0-cloud-deploy-web-only-hosted
scenario: Negative
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-025-002
  - e-025
created: '2026-04-30'
updated: '2026-05-04'
pmagent_source:
  slug: morbius
  story_id: S-025-002
  ac_index: 0
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-025-cloud-deploy/T-025-002-s-025-002-test-plan.md
  source_checksum: cca7e8b4d05e66a0
---
## Steps
# Test Plan: Given the env var MORBIUSDATADIR=/tmp/morbius-test is set When the ser

**ID:** T-025-002
**Project:** morbius
**Story:** S-025-002
**Epic:** E-025
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

> _Generated from Morbius test cases (E-023 publish-back). 3 test case(s) sourced from `morbius:S-025-002`._

---

## Scope

Verification of S-025-002 acceptance criteria. 3 test case(s) span the happy path plus negative and edge variations.

## Prerequisites

- (Inherit from story Prerequisites; fill in environment + data setup before authoring)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 | TC-025-002-001 (P0) | ✓ |
| AC-002 | TC-025-002-002 | ✓ |
| AC-003 | TC-025-002-003 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-025-002-001: Given the env var MORBIUSDATADIR=/tmp/morbius-test is set When the ser

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

<!-- Morbius source: TC-MOR-025-002-1 (sourceChecksum=85bb0315217bd5bb) -->

**Preconditions:**
- (derived from story prerequisites — fill in or leave empty)

**Steps:**
1. the env var `MORBIUS_DATA_DIR=/tmp/morbius-test` is set
2. the server boots and a user creates a project via `POST /api/projects/create`
3. `data/projects.json` and the project's `tests/` / `bugs/` / `runs/` subdirs are written under `/tmp/morbius-test/`, not `<cwd>/data/`

**Expected Result:**
Given the env var `MORBIUS_DATA_DIR=/tmp/morbius-test` is set When the server boots and a user creates a project via `POST /api/projects/create` Then `data/projects.json` and the project's `tests/` / `bugs/` / `runs/` subdirs are written under `/tmp/morbius-test/`, not `<cwd>/data/`

**Failure Indicators:**
- (describe the wrong behavior; populate during real test authoring)

---

## Sub Flows

> All test cases beyond the core flow. Negative scenarios, edge cases, and regr

## Expected Result
# Test Plan: Given the env var MORBIUSDATADIR=/tmp/morbius-test is set When the ser

**ID:** T-025-002
**Project:** morbius
**Story:** S-025-002
**Epic:** E-025
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

> _Generated from Morbius test cases (E-023 publish-back). 3 test case(s) sourced from `morbius:S-025-002`._

---

## Scope

Verification of S-025-002 acceptance criteria. 3 test case(s) span the happy path plus negative and edge variations.

## Prerequisites

- (Inherit from story Prerequisites; fill in environment + data setup before authoring)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 | TC-025-002-001 (P0) | ✓ |
| AC-002 | TC-025-002-002 | ✓ |
| AC-003 | TC-025-002-003 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-025-002-001: Given the env var MORBIUSDATADIR=/tmp/morbius-test is set When the ser

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

<!-- Morbius source: TC-MOR-025-002-1 (sourceChecksum=85bb0315217bd5bb) -->

**Preconditions:**
- (derived from story prerequisites — fill in or leave empty)

**Steps:**
1. the env var `MORBIUS_DATA_DIR=/tmp/morbius-test` is set
2. the server boots and a user creates a project via `POST /api/projects/create`
3. `data/projects.json` and the project's `tests/` / `bugs/` / `runs/` subdirs are written under `/tmp/morbius-test/`, not `<cwd>/data/`

**Expected Result:**
Given the env var `MORBIUS_DATA_DIR=/tmp/morbius-test` is set When the server boots and a user creates a project via `POST /api/projects/create` Then `data/projects.json` and the project's `tests/` / `bugs/` / `runs/` subdirs are written under `/tmp/morbius-test/`, not `<cwd>/data/`

**Failure Indicators:**
- (describe the wrong behavior; populate during real test authoring)

---

## Sub Flows

> All test cases beyond the core flow. Negative scenarios, edge cases, and regr

