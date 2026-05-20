---
id: TC-MOR-025-006-1
title: E-022 Gate Flip + Direction Doc Addendum — Test Plan
category: e-025-morbius-v2-0-cloud-deploy-web-only-hosted
scenario: Negative
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-025-006
  - e-025
created: '2026-04-30'
updated: '2026-05-04'
pmagent_source:
  slug: morbius
  story_id: S-025-006
  ac_index: 0
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-025-cloud-deploy/T-025-006-s-025-006-test-plan.md
  source_checksum: 0488709fca413803
---
## Steps
# Test Plan: Given E-022 is currently Stage

**ID:** T-025-006
**Project:** morbius
**Story:** S-025-006
**Epic:** E-025
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

> _Generated from Morbius test cases (E-023 publish-back). 3 test case(s) sourced from `morbius:S-025-006`._

---

## Scope

Verification of S-025-006 acceptance criteria. 3 test case(s) span the happy path plus negative and edge variations.

## Prerequisites

- (Inherit from story Prerequisites; fill in environment + data setup before authoring)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 | TC-025-006-001 (P0) | ✓ |
| AC-002 | TC-025-006-002 | ✓ |
| AC-003 | TC-025-006-003 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-025-006-001: Given E-022 is currently Stage: Backlog · Status: Decision-only When I

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

<!-- Morbius source: TC-MOR-025-006-1 (sourceChecksum=eee394812a347d70) -->

**Preconditions:**
- (derived from story prerequisites — fill in or leave empty)

**Steps:**
1. E-022 is currently `Stage: Backlog · Status: Decision-only`
2. I update its frontmatter and append a Change Log entry
3. Status becomes `decided` and the changelog row records: *"2026-04-30 · gate flipped to 'decided: yes, migrate Morbius's web-runner agent path to Anthropic Managed Agents as v2.1 (with Agent SDK as fallback)' per user direction during E-025 planning. Rationale: zero CLI/SDK process management in our infra, Anthropic handles scale/retries/observability."*

**Expected Result:**
Given E-022 is currently `Stage: Backlog · Status: Decision-only` When I update its frontmatter and append a Change Log entry Then Status becomes `decided` and the changelog row records: *"2026-04-30 · gate flipped to 'decided: yes, migrate Morbius's web-runner agent path to Anthropic Managed Agents as v2.1 (with

## Expected Result
# Test Plan: Given E-022 is currently Stage

**ID:** T-025-006
**Project:** morbius
**Story:** S-025-006
**Epic:** E-025
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

> _Generated from Morbius test cases (E-023 publish-back). 3 test case(s) sourced from `morbius:S-025-006`._

---

## Scope

Verification of S-025-006 acceptance criteria. 3 test case(s) span the happy path plus negative and edge variations.

## Prerequisites

- (Inherit from story Prerequisites; fill in environment + data setup before authoring)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 | TC-025-006-001 (P0) | ✓ |
| AC-002 | TC-025-006-002 | ✓ |
| AC-003 | TC-025-006-003 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-025-006-001: Given E-022 is currently Stage: Backlog · Status: Decision-only When I

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

<!-- Morbius source: TC-MOR-025-006-1 (sourceChecksum=eee394812a347d70) -->

**Preconditions:**
- (derived from story prerequisites — fill in or leave empty)

**Steps:**
1. E-022 is currently `Stage: Backlog · Status: Decision-only`
2. I update its frontmatter and append a Change Log entry
3. Status becomes `decided` and the changelog row records: *"2026-04-30 · gate flipped to 'decided: yes, migrate Morbius's web-runner agent path to Anthropic Managed Agents as v2.1 (with Agent SDK as fallback)' per user direction during E-025 planning. Rationale: zero CLI/SDK process management in our infra, Anthropic handles scale/retries/observability."*

**Expected Result:**
Given E-022 is currently `Stage: Backlog · Status: Decision-only` When I update its frontmatter and append a Change Log entry Then Status becomes `decided` and the changelog row records: *"2026-04-30 · gate flipped to 'decided: yes, migrate Morbius's web-runner agent path to Anthropic Managed Agents as v2.1 (with

