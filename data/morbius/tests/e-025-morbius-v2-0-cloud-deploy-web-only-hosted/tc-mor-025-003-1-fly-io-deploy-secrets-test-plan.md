---
id: TC-MOR-025-003-1
title: Fly.io Deploy + Secrets — Test Plan
category: e-025-morbius-v2-0-cloud-deploy-web-only-hosted
scenario: Negative
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-025-003
  - e-025
created: '2026-04-30'
updated: '2026-05-04'
pmagent_source:
  slug: morbius
  story_id: S-025-003
  ac_index: 0
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-025-cloud-deploy/T-025-003-s-025-003-test-plan.md
  source_checksum: 78284842a3cfb767
---
## Steps
# Test Plan: Given a Fly

**ID:** T-025-003
**Project:** morbius
**Story:** S-025-003
**Epic:** E-025
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

> _Generated from Morbius test cases (E-023 publish-back). 4 test case(s) sourced from `morbius:S-025-003`._

---

## Scope

Verification of S-025-003 acceptance criteria. 4 test case(s) span the happy path plus negative and edge variations.

## Prerequisites

- (Inherit from story Prerequisites; fill in environment + data setup before authoring)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 | TC-025-003-001 (P0) | ✓ |
| AC-002 | TC-025-003-002 | ✓ |
| AC-003 | TC-025-003-003 | ✓ |
| AC-004 | TC-025-003-004 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-025-003-001: Given a Fly.io account and the flyctl CLI installed When I run fly lau

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

<!-- Morbius source: TC-MOR-025-003-1 (sourceChecksum=ff9d5000b7f87db4) -->

**Preconditions:**
- (derived from story prerequisites — fill in or leave empty)

**Steps:**
1. a Fly.io account and the `flyctl` CLI installed
2. I run `fly launch` from the Morbius repo (with `fly.toml` checked in)
3. Fly creates an app `morbius-rf` (or similar), provisions a 1 GB / 1 vCPU VM in `iad`, mounts a 10 GB volume at `/data`, builds from the local Dockerfile, and starts the container

**Expected Result:**
Given a Fly.io account and the `flyctl` CLI installed When I run `fly launch` from the Morbius repo (with `fly.toml` checked in) Then Fly creates an app `morbius-rf` (or similar), provisions a 1 GB / 1 vCPU VM in `iad`, mounts a 10 GB volume at `/data`, builds from the local Dockerfile, and starts the container

**Failure Indicators:**
- (describe the wrong behavior; populate during real test authoring)

---

## Sub Flows

> All test cases beyond the core flow. Negative 

## Expected Result
# Test Plan: Given a Fly

**ID:** T-025-003
**Project:** morbius
**Story:** S-025-003
**Epic:** E-025
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

> _Generated from Morbius test cases (E-023 publish-back). 4 test case(s) sourced from `morbius:S-025-003`._

---

## Scope

Verification of S-025-003 acceptance criteria. 4 test case(s) span the happy path plus negative and edge variations.

## Prerequisites

- (Inherit from story Prerequisites; fill in environment + data setup before authoring)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 | TC-025-003-001 (P0) | ✓ |
| AC-002 | TC-025-003-002 | ✓ |
| AC-003 | TC-025-003-003 | ✓ |
| AC-004 | TC-025-003-004 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-025-003-001: Given a Fly.io account and the flyctl CLI installed When I run fly lau

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

<!-- Morbius source: TC-MOR-025-003-1 (sourceChecksum=ff9d5000b7f87db4) -->

**Preconditions:**
- (derived from story prerequisites — fill in or leave empty)

**Steps:**
1. a Fly.io account and the `flyctl` CLI installed
2. I run `fly launch` from the Morbius repo (with `fly.toml` checked in)
3. Fly creates an app `morbius-rf` (or similar), provisions a 1 GB / 1 vCPU VM in `iad`, mounts a 10 GB volume at `/data`, builds from the local Dockerfile, and starts the container

**Expected Result:**
Given a Fly.io account and the `flyctl` CLI installed When I run `fly launch` from the Morbius repo (with `fly.toml` checked in) Then Fly creates an app `morbius-rf` (or similar), provisions a 1 GB / 1 vCPU VM in `iad`, mounts a 10 GB volume at `/data`, builds from the local Dockerfile, and starts the container

**Failure Indicators:**
- (describe the wrong behavior; populate during real test authoring)

---

## Sub Flows

> All test cases beyond the core flow. Negative 

