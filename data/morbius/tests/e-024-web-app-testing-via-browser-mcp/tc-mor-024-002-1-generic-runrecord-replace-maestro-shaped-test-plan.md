---
id: TC-MOR-024-002-1
title: Generic RunRecord (replace Maestro-shaped) — Test Plan
category: e-024-web-app-testing-via-browser-mcp
scenario: Negative
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-024-002
  - e-024
created: '2026-04-29'
updated: '2026-04-30'
pmagent_source:
  slug: morbius
  story_id: S-024-002
  ac_index: 0
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-024-web-app-testing/T-024-002-s-024-002-test-plan.md
  source_checksum: d57857a1197bcdc4
---
## Steps
# Test Plan: Given the RunRecord interface is widened (Maestro fields failingStep /

**ID:** T-024-002
**Project:** morbius
**Story:** S-024-002
**Epic:** E-024
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

> _Generated from Morbius test cases (E-023 publish-back). 3 test case(s) sourced from `morbius:S-024-002`._

---

## Scope

Verification of S-024-002 acceptance criteria. 3 test case(s) span the happy path plus negative and edge variations.

## Prerequisites

- (Inherit from story Prerequisites; fill in environment + data setup before authoring)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 | TC-024-002-001 (P0) | ✓ |
| AC-002 | TC-024-002-002 | ✓ |
| AC-003 | TC-024-002-003 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-024-002-001: Given the RunRecord interface is widened (Maestro fields failingStep /

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

<!-- Morbius source: TC-MOR-024-002-1 (sourceChecksum=c361137128e400c4) -->

**Preconditions:**
- (derived from story prerequisites — fill in or leave empty)

**Steps:**
1. the `RunRecord` interface is widened (Maestro fields `failingStep` / `errorLine` / `exitCode` become optional, new fields `runner`, `target`, `screenshots[]`, `targetUrl?`, `domSnapshot?`)
2. existing Maestro run records are deserialized via `loadAllRuns(dir)`
3. they round-trip cleanly with the Maestro fields populated and the new web-only fields absent

**Expected Result:**
Given the `RunRecord` interface is widened (Maestro fields `failingStep` / `errorLine` / `exitCode` become optional, new fields `runner`, `target`, `screenshots[]`, `targetUrl?`, `domSnapshot?`) When existing Maestro run records are deserialized via `loadAllRuns(dir)` Then they round-trip cleanly with the Maestro fields populated and the new web-only fields absent

**Failure Indicators:**
- 

## Expected Result
# Test Plan: Given the RunRecord interface is widened (Maestro fields failingStep /

**ID:** T-024-002
**Project:** morbius
**Story:** S-024-002
**Epic:** E-024
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

> _Generated from Morbius test cases (E-023 publish-back). 3 test case(s) sourced from `morbius:S-024-002`._

---

## Scope

Verification of S-024-002 acceptance criteria. 3 test case(s) span the happy path plus negative and edge variations.

## Prerequisites

- (Inherit from story Prerequisites; fill in environment + data setup before authoring)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 | TC-024-002-001 (P0) | ✓ |
| AC-002 | TC-024-002-002 | ✓ |
| AC-003 | TC-024-002-003 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-024-002-001: Given the RunRecord interface is widened (Maestro fields failingStep /

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

<!-- Morbius source: TC-MOR-024-002-1 (sourceChecksum=c361137128e400c4) -->

**Preconditions:**
- (derived from story prerequisites — fill in or leave empty)

**Steps:**
1. the `RunRecord` interface is widened (Maestro fields `failingStep` / `errorLine` / `exitCode` become optional, new fields `runner`, `target`, `screenshots[]`, `targetUrl?`, `domSnapshot?`)
2. existing Maestro run records are deserialized via `loadAllRuns(dir)`
3. they round-trip cleanly with the Maestro fields populated and the new web-only fields absent

**Expected Result:**
Given the `RunRecord` interface is widened (Maestro fields `failingStep` / `errorLine` / `exitCode` become optional, new fields `runner`, `target`, `screenshots[]`, `targetUrl?`, `domSnapshot?`) When existing Maestro run records are deserialized via `loadAllRuns(dir)` Then they round-trip cleanly with the Maestro fields populated and the new web-only fields absent

**Failure Indicators:**
- 

