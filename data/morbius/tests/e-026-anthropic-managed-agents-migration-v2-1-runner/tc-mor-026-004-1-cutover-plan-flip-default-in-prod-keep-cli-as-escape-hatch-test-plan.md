---
id: TC-MOR-026-004-1
title: 'Cutover Plan — Flip Default in Prod, Keep CLI as Escape Hatch — Test Plan'
category: e-026-anthropic-managed-agents-migration-v2-1-runner
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-026-004
  - e-026
created: '2026-04-30'
updated: '2026-05-04'
pmagent_source:
  slug: morbius
  story_id: S-026-004
  ac_index: 0
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-026-managed-agents-migration/T-026-004-s-026-004-test-plan.md
  source_checksum: 955af21a3fa02578
---
## Steps
# Test Plan: Given S-026-003 has been live as opt-in for ≥7 days with ≥20 real test

**ID:** T-026-004
**Project:** morbius
**Story:** S-026-004
**Epic:** E-026
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

> _Generated from Morbius test cases (E-023 publish-back). 5 test case(s) sourced from `morbius:S-026-004`._

---

## Scope

Verification of S-026-004 acceptance criteria. 5 test case(s) span the happy path plus negative and edge variations.

## Prerequisites

- (Inherit from story Prerequisites; fill in environment + data setup before authoring)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 | TC-026-004-001 | ✓ |
| AC-002 | TC-026-004-002 | ✓ |
| AC-003 | TC-026-004-003 | ✓ |
| AC-004 | TC-026-004-004 | ✓ |
| AC-005 | TC-026-004-005 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-026-004-001: Given S-026-003 has been live as opt-in for ≥7 days with ≥20 real test

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

<!-- Morbius source: TC-MOR-026-004-1 (sourceChecksum=25e8cecd8e7e85b6) -->

**Preconditions:**
- (derived from story prerequisites — fill in or leave empty)

**Steps:**
1. S-026-003 has been live as opt-in for ≥7 days with ≥20 real test runs in `managed-agents` mode
2. I review the parity report (CLI vs. managed-agents pass/fail counts, latency p50/p95, cost per run)
3. the report shows: pass rate within 2 percentage points of CLI, p95 latency within 1.2× CLI, cost within 2× CLI baseline. If any of those fail, cutover is blocked — go back to S-026-003 and investigate.

**Expected Result:**
Given S-026-003 has been live as opt-in for ≥7 days with ≥20 real test runs in `managed-agents` mode When I review the parity report (CLI vs. managed-agents pass/fail counts, latency p50/p95, cost per run) Then the report shows: pass rate within 2 percentage points of CLI, p95 latency wit

## Expected Result
# Test Plan: Given S-026-003 has been live as opt-in for ≥7 days with ≥20 real test

**ID:** T-026-004
**Project:** morbius
**Story:** S-026-004
**Epic:** E-026
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

> _Generated from Morbius test cases (E-023 publish-back). 5 test case(s) sourced from `morbius:S-026-004`._

---

## Scope

Verification of S-026-004 acceptance criteria. 5 test case(s) span the happy path plus negative and edge variations.

## Prerequisites

- (Inherit from story Prerequisites; fill in environment + data setup before authoring)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 | TC-026-004-001 | ✓ |
| AC-002 | TC-026-004-002 | ✓ |
| AC-003 | TC-026-004-003 | ✓ |
| AC-004 | TC-026-004-004 | ✓ |
| AC-005 | TC-026-004-005 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-026-004-001: Given S-026-003 has been live as opt-in for ≥7 days with ≥20 real test

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

<!-- Morbius source: TC-MOR-026-004-1 (sourceChecksum=25e8cecd8e7e85b6) -->

**Preconditions:**
- (derived from story prerequisites — fill in or leave empty)

**Steps:**
1. S-026-003 has been live as opt-in for ≥7 days with ≥20 real test runs in `managed-agents` mode
2. I review the parity report (CLI vs. managed-agents pass/fail counts, latency p50/p95, cost per run)
3. the report shows: pass rate within 2 percentage points of CLI, p95 latency within 1.2× CLI, cost within 2× CLI baseline. If any of those fail, cutover is blocked — go back to S-026-003 and investigate.

**Expected Result:**
Given S-026-003 has been live as opt-in for ≥7 days with ≥20 real test runs in `managed-agents` mode When I review the parity report (CLI vs. managed-agents pass/fail counts, latency p50/p95, cost per run) Then the report shows: pass rate within 2 percentage points of CLI, p95 latency wit

