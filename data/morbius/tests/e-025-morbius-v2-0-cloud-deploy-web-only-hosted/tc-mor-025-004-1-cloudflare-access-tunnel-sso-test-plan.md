---
id: TC-MOR-025-004-1
title: Cloudflare Access + Tunnel SSO — Test Plan
category: e-025-morbius-v2-0-cloud-deploy-web-only-hosted
scenario: Negative
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-025-004
  - e-025
created: '2026-04-30'
updated: '2026-05-04'
pmagent_source:
  slug: morbius
  story_id: S-025-004
  ac_index: 0
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-025-cloud-deploy/T-025-004-s-025-004-test-plan.md
  source_checksum: ff5a685b54e7ae08
---
## Steps
# Test Plan: Given the Fly app from S-025-003 is running at https

**ID:** T-025-004
**Project:** morbius
**Story:** S-025-004
**Epic:** E-025
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

> _Generated from Morbius test cases (E-023 publish-back). 4 test case(s) sourced from `morbius:S-025-004`._

---

## Scope

Verification of S-025-004 acceptance criteria. 4 test case(s) span the happy path plus negative and edge variations.

## Prerequisites

- (Inherit from story Prerequisites; fill in environment + data setup before authoring)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 | TC-025-004-001 | ✓ |
| AC-002 | TC-025-004-002 | ✓ |
| AC-003 | TC-025-004-003 | ✓ |
| AC-004 | TC-025-004-004 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-025-004-001: Given the Fly app from S-025-003 is running at https://morbius-rf.fly.

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

<!-- Morbius source: TC-MOR-025-004-1 (sourceChecksum=81ba28397414cc2e) -->

**Preconditions:**
- (derived from story prerequisites — fill in or leave empty)

**Steps:**
1. the Fly app from S-025-003 is running at `https://morbius-rf.fly.dev/`
2. I set up a Cloudflare Tunnel pointing at the Fly app and bind `morbius.redfoundry.dev` (or similar) to it via Cloudflare DNS
3. opening the public domain terminates TLS at Cloudflare's edge and proxies traffic to the Fly app

**Expected Result:**
Given the Fly app from S-025-003 is running at `https://morbius-rf.fly.dev/` When I set up a Cloudflare Tunnel pointing at the Fly app and bind `morbius.redfoundry.dev` (or similar) to it via Cloudflare DNS Then opening the public domain terminates TLS at Cloudflare's edge and proxies traffic to the Fly app

**Failure Indicators:**
- (describe the wrong behavior; populate during real test authoring)

---

## Sub Flows

> All test cases bey

## Expected Result
# Test Plan: Given the Fly app from S-025-003 is running at https

**ID:** T-025-004
**Project:** morbius
**Story:** S-025-004
**Epic:** E-025
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

> _Generated from Morbius test cases (E-023 publish-back). 4 test case(s) sourced from `morbius:S-025-004`._

---

## Scope

Verification of S-025-004 acceptance criteria. 4 test case(s) span the happy path plus negative and edge variations.

## Prerequisites

- (Inherit from story Prerequisites; fill in environment + data setup before authoring)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 | TC-025-004-001 | ✓ |
| AC-002 | TC-025-004-002 | ✓ |
| AC-003 | TC-025-004-003 | ✓ |
| AC-004 | TC-025-004-004 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-025-004-001: Given the Fly app from S-025-003 is running at https://morbius-rf.fly.

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

<!-- Morbius source: TC-MOR-025-004-1 (sourceChecksum=81ba28397414cc2e) -->

**Preconditions:**
- (derived from story prerequisites — fill in or leave empty)

**Steps:**
1. the Fly app from S-025-003 is running at `https://morbius-rf.fly.dev/`
2. I set up a Cloudflare Tunnel pointing at the Fly app and bind `morbius.redfoundry.dev` (or similar) to it via Cloudflare DNS
3. opening the public domain terminates TLS at Cloudflare's edge and proxies traffic to the Fly app

**Expected Result:**
Given the Fly app from S-025-003 is running at `https://morbius-rf.fly.dev/` When I set up a Cloudflare Tunnel pointing at the Fly app and bind `morbius.redfoundry.dev` (or similar) to it via Cloudflare DNS Then opening the public domain terminates TLS at Cloudflare's edge and proxies traffic to the Fly app

**Failure Indicators:**
- (describe the wrong behavior; populate during real test authoring)

---

## Sub Flows

> All test cases bey

