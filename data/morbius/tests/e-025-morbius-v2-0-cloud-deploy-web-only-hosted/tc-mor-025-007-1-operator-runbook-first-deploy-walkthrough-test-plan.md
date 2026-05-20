---
id: TC-MOR-025-007-1
title: Operator Runbook + First-Deploy Walkthrough — Test Plan
category: e-025-morbius-v2-0-cloud-deploy-web-only-hosted
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-025-007
  - e-025
created: '2026-04-30'
updated: '2026-05-04'
pmagent_source:
  slug: morbius
  story_id: S-025-007
  ac_index: 0
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-025-cloud-deploy/T-025-007-s-025-007-test-plan.md
  source_checksum: fc9a41aa09ce064d
---
## Steps
# Test Plan: Given I have a Fly account, a Cloudflare account with the RF zone, RF

**ID:** T-025-007
**Project:** morbius
**Story:** S-025-007
**Epic:** E-025
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

> _Generated from Morbius test cases (E-023 publish-back). 8 test case(s) sourced from `morbius:S-025-007`._

---

## Scope

Verification of S-025-007 acceptance criteria. 8 test case(s) span the happy path plus negative and edge variations.

## Prerequisites

- (Inherit from story Prerequisites; fill in environment + data setup before authoring)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 | TC-025-007-001 (P0) | ✓ |
| AC-002 | TC-025-007-002 | ✓ |
| AC-003 | TC-025-007-003 | ✓ |
| AC-004 | TC-025-007-004 | ✓ |
| AC-005 | TC-025-007-005 | ✓ |
| AC-006 | TC-025-007-006 | ✓ |
| AC-007 | TC-025-007-007 | ✓ |
| AC-008 | TC-025-007-008 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-025-007-001: Given I have a Fly account, a Cloudflare account with the RF zone, RF

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

<!-- Morbius source: TC-MOR-025-007-1 (sourceChecksum=a44a0bca6f75ca8d) -->

**Preconditions:**
- (derived from story prerequisites — fill in or leave empty)

**Steps:**
1. I have a Fly account, a Cloudflare account with the RF zone, RF Google Workspace admin access, and an Anthropic API key
2. I follow `docs/cloud-deploy.md` start-to-finish
3. I produce a working `https://morbius.redfoundry.dev` (or a clone for testing) within 60 minutes, including Cloudflare Access policy and PMAgent checkout

**Expected Result:**
Given I have a Fly account, a Cloudflare account with the RF zone, RF Google Workspace admin access, and an Anthropic API key When I follow `docs/cloud-deploy.md` start-to-finish Then I produce a working `https://morbius.redfoundry.dev` (or a clone for testing) with

## Expected Result
# Test Plan: Given I have a Fly account, a Cloudflare account with the RF zone, RF

**ID:** T-025-007
**Project:** morbius
**Story:** S-025-007
**Epic:** E-025
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

> _Generated from Morbius test cases (E-023 publish-back). 8 test case(s) sourced from `morbius:S-025-007`._

---

## Scope

Verification of S-025-007 acceptance criteria. 8 test case(s) span the happy path plus negative and edge variations.

## Prerequisites

- (Inherit from story Prerequisites; fill in environment + data setup before authoring)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 | TC-025-007-001 (P0) | ✓ |
| AC-002 | TC-025-007-002 | ✓ |
| AC-003 | TC-025-007-003 | ✓ |
| AC-004 | TC-025-007-004 | ✓ |
| AC-005 | TC-025-007-005 | ✓ |
| AC-006 | TC-025-007-006 | ✓ |
| AC-007 | TC-025-007-007 | ✓ |
| AC-008 | TC-025-007-008 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-025-007-001: Given I have a Fly account, a Cloudflare account with the RF zone, RF

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

<!-- Morbius source: TC-MOR-025-007-1 (sourceChecksum=a44a0bca6f75ca8d) -->

**Preconditions:**
- (derived from story prerequisites — fill in or leave empty)

**Steps:**
1. I have a Fly account, a Cloudflare account with the RF zone, RF Google Workspace admin access, and an Anthropic API key
2. I follow `docs/cloud-deploy.md` start-to-finish
3. I produce a working `https://morbius.redfoundry.dev` (or a clone for testing) within 60 minutes, including Cloudflare Access policy and PMAgent checkout

**Expected Result:**
Given I have a Fly account, a Cloudflare account with the RF zone, RF Google Workspace admin access, and an Anthropic API key When I follow `docs/cloud-deploy.md` start-to-finish Then I produce a working `https://morbius.redfoundry.dev` (or a clone for testing) with

