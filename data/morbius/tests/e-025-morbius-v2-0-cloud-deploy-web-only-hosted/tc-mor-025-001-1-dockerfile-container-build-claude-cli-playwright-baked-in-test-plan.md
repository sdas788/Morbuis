---
id: TC-MOR-025-001-1
title: Dockerfile + Container Build (Claude CLI + Playwright Baked In) — Test Plan
category: e-025-morbius-v2-0-cloud-deploy-web-only-hosted
scenario: Negative
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-025-001
  - e-025
created: '2026-04-30'
updated: '2026-05-04'
pmagent_source:
  slug: morbius
  story_id: S-025-001
  ac_index: 0
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-025-cloud-deploy/T-025-001-s-025-001-test-plan.md
  source_checksum: 6e917988ef04605d
---
## Steps
# Test Plan: Given a clean checkout of the Morbius repo When I run docker build -t

**ID:** T-025-001
**Project:** morbius
**Story:** S-025-001
**Epic:** E-025
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

> _Generated from Morbius test cases (E-023 publish-back). 3 test case(s) sourced from `morbius:S-025-001`._

---

## Scope

Verification of S-025-001 acceptance criteria. 3 test case(s) span the happy path plus negative and edge variations.

## Prerequisites

- (Inherit from story Prerequisites; fill in environment + data setup before authoring)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 | TC-025-001-001 (P0) | ✓ |
| AC-002 | TC-025-001-002 | ✓ |
| AC-003 | TC-025-001-003 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-025-001-001: Given a clean checkout of the Morbius repo When I run docker build -t

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

<!-- Morbius source: TC-MOR-025-001-1 (sourceChecksum=eddf0ca32ef7e652) -->

**Preconditions:**
- (derived from story prerequisites — fill in or leave empty)

**Steps:**
1. a clean checkout of the Morbius repo
2. I run `docker build -t morbius:v2.0 .`
3. the build succeeds and produces an image that contains: Node 20, the compiled `dist/`, production `node_modules`, `@anthropic-ai/claude-code` CLI globally available on PATH, and `playwright` with Chromium installed via `--with-deps` (system libs picked up)

**Expected Result:**
Given a clean checkout of the Morbius repo When I run `docker build -t morbius:v2.0 .` Then the build succeeds and produces an image that contains: Node 20, the compiled `dist/`, production `node_modules`, `@anthropic-ai/claude-code` CLI globally available on PATH, and `playwright` with Chromium installed via `--with-deps` (system libs picked up)

**Failure Indicators:**
- (describe the wrong behavior; populate

## Expected Result
# Test Plan: Given a clean checkout of the Morbius repo When I run docker build -t

**ID:** T-025-001
**Project:** morbius
**Story:** S-025-001
**Epic:** E-025
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

> _Generated from Morbius test cases (E-023 publish-back). 3 test case(s) sourced from `morbius:S-025-001`._

---

## Scope

Verification of S-025-001 acceptance criteria. 3 test case(s) span the happy path plus negative and edge variations.

## Prerequisites

- (Inherit from story Prerequisites; fill in environment + data setup before authoring)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 | TC-025-001-001 (P0) | ✓ |
| AC-002 | TC-025-001-002 | ✓ |
| AC-003 | TC-025-001-003 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-025-001-001: Given a clean checkout of the Morbius repo When I run docker build -t

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

<!-- Morbius source: TC-MOR-025-001-1 (sourceChecksum=eddf0ca32ef7e652) -->

**Preconditions:**
- (derived from story prerequisites — fill in or leave empty)

**Steps:**
1. a clean checkout of the Morbius repo
2. I run `docker build -t morbius:v2.0 .`
3. the build succeeds and produces an image that contains: Node 20, the compiled `dist/`, production `node_modules`, `@anthropic-ai/claude-code` CLI globally available on PATH, and `playwright` with Chromium installed via `--with-deps` (system libs picked up)

**Expected Result:**
Given a clean checkout of the Morbius repo When I run `docker build -t morbius:v2.0 .` Then the build succeeds and produces an image that contains: Node 20, the compiled `dist/`, production `node_modules`, `@anthropic-ai/claude-code` CLI globally available on PATH, and `playwright` with Chromium installed via `--with-deps` (system libs picked up)

**Failure Indicators:**
- (describe the wrong behavior; populate

