---
id: TC-MOR-026-001-1
title: Managed Agents API Spike — POST a No-Op Task — Test Plan
category: e-026-anthropic-managed-agents-migration-v2-1-runner
scenario: Negative
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-026-001
  - e-026
created: '2026-04-30'
updated: '2026-05-04'
pmagent_source:
  slug: morbius
  story_id: S-026-001
  ac_index: 0
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-026-managed-agents-migration/T-026-001-s-026-001-test-plan.md
  source_checksum: 66d14250033e7a0b
---
## Steps
# Test Plan: Given I have the ANTHROPICAPIKEY for Morbius's project and access to M

**ID:** T-026-001
**Project:** morbius
**Story:** S-026-001
**Epic:** E-026
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

> _Generated from Morbius test cases (E-023 publish-back). 10 test case(s) sourced from `morbius:S-026-001`._

---

## Scope

Verification of S-026-001 acceptance criteria. 10 test case(s) span the happy path plus negative and edge variations.

## Prerequisites

- (Inherit from story Prerequisites; fill in environment + data setup before authoring)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 | TC-026-001-001 (P0) | ✓ |
| AC-002 | TC-026-001-002 | ✓ |
| AC-003 | TC-026-001-003 | ✓ |
| AC-004 | TC-026-001-004 | ✓ |
| AC-005 | TC-026-001-005 | ✓ |
| AC-006 | TC-026-001-006 | ✓ |
| AC-007 | TC-026-001-007 | ✓ |
| AC-008 | TC-026-001-008 | ✓ |
| AC-009 | TC-026-001-009 | ✓ |
| AC-010 | TC-026-001-010 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-026-001-001: Given I have the ANTHROPICAPIKEY for Morbius's project and access to M

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

<!-- Morbius source: TC-MOR-026-001-1 (sourceChecksum=db6c50de96b6bb8f) -->

**Preconditions:**
- (derived from story prerequisites — fill in or leave empty)

**Steps:**
1. I have the `ANTHROPIC_API_KEY` for Morbius's project and access to Managed Agents API documentation
2. I run `tsx scripts/spike/managed-agents-noop.ts`
3. the script POSTs a "say hello" task with no MCPs attached, polls (or webhooks) for completion, and prints the final result text — proving auth + request shape + completion signaling all work end-to-end

**Expected Result:**
Given I have the `ANTHROPIC_API_KEY` for Morbius's project and access to Managed Agents API documentation When I run `tsx scripts/spike/managed-agents-noop.ts` Then the

## Expected Result
# Test Plan: Given I have the ANTHROPICAPIKEY for Morbius's project and access to M

**ID:** T-026-001
**Project:** morbius
**Story:** S-026-001
**Epic:** E-026
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

> _Generated from Morbius test cases (E-023 publish-back). 10 test case(s) sourced from `morbius:S-026-001`._

---

## Scope

Verification of S-026-001 acceptance criteria. 10 test case(s) span the happy path plus negative and edge variations.

## Prerequisites

- (Inherit from story Prerequisites; fill in environment + data setup before authoring)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 | TC-026-001-001 (P0) | ✓ |
| AC-002 | TC-026-001-002 | ✓ |
| AC-003 | TC-026-001-003 | ✓ |
| AC-004 | TC-026-001-004 | ✓ |
| AC-005 | TC-026-001-005 | ✓ |
| AC-006 | TC-026-001-006 | ✓ |
| AC-007 | TC-026-001-007 | ✓ |
| AC-008 | TC-026-001-008 | ✓ |
| AC-009 | TC-026-001-009 | ✓ |
| AC-010 | TC-026-001-010 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-026-001-001: Given I have the ANTHROPICAPIKEY for Morbius's project and access to M

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

<!-- Morbius source: TC-MOR-026-001-1 (sourceChecksum=db6c50de96b6bb8f) -->

**Preconditions:**
- (derived from story prerequisites — fill in or leave empty)

**Steps:**
1. I have the `ANTHROPIC_API_KEY` for Morbius's project and access to Managed Agents API documentation
2. I run `tsx scripts/spike/managed-agents-noop.ts`
3. the script POSTs a "say hello" task with no MCPs attached, polls (or webhooks) for completion, and prints the final result text — proving auth + request shape + completion signaling all work end-to-end

**Expected Result:**
Given I have the `ANTHROPIC_API_KEY` for Morbius's project and access to Managed Agents API documentation When I run `tsx scripts/spike/managed-agents-noop.ts` Then the

