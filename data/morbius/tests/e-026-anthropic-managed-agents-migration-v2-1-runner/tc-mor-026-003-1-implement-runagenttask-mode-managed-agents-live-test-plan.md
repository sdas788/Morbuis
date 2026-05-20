---
id: TC-MOR-026-003-1
title: 'Implement `runAgentTask({mode:''managed-agents''})` Live — Test Plan'
category: e-026-anthropic-managed-agents-migration-v2-1-runner
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-026-003
  - e-026
created: '2026-04-30'
updated: '2026-05-04'
pmagent_source:
  slug: morbius
  story_id: S-026-003
  ac_index: 0
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-026-managed-agents-migration/T-026-003-s-026-003-test-plan.md
  source_checksum: 4358c6f578113798
---
## Steps
# Test Plan: Given S-026-001 (API spike) and S-026-002 (architecture decision) are

**ID:** T-026-003
**Project:** morbius
**Story:** S-026-003
**Epic:** E-026
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

> _Generated from Morbius test cases (E-023 publish-back). 4 test case(s) sourced from `morbius:S-026-003`._

---

## Scope

Verification of S-026-003 acceptance criteria. 4 test case(s) span the happy path plus negative and edge variations.

## Prerequisites

- (Inherit from story Prerequisites; fill in environment + data setup before authoring)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 | TC-026-003-001 | ✓ |
| AC-002 | TC-026-003-002 | ✓ |
| AC-003 | TC-026-003-003 | ✓ |
| AC-004 | TC-026-003-004 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-026-003-001: Given S-026-001 (API spike) and S-026-002 (architecture decision) are

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

<!-- Morbius source: TC-MOR-026-003-1 (sourceChecksum=fd2124c45991cf3c) -->

**Preconditions:**
- (derived from story prerequisites — fill in or leave empty)

**Steps:**
1. S-026-001 (API spike) and S-026-002 (architecture decision) are both done
2. I implement the `managed-agents` mode in `src/runners/web-agent.ts`
3. `runAgentTask({mode:'managed-agents', prompt, mcps, allowedTools, timeoutMs})` returns a `AgentResult` with the same shape as CLI mode — same screenshots, same step log, same pass/fail signal — so the dashboard UI doesn't care which runner produced the result

**Expected Result:**
Given S-026-001 (API spike) and S-026-002 (architecture decision) are both done When I implement the `managed-agents` mode in `src/runners/web-agent.ts` Then `runAgentTask({mode:'managed-agents', prompt, mcps, allowedTools, timeoutMs})` returns a `AgentResult` with the same shape as CLI mode — same screenshots, same 

## Expected Result
# Test Plan: Given S-026-001 (API spike) and S-026-002 (architecture decision) are

**ID:** T-026-003
**Project:** morbius
**Story:** S-026-003
**Epic:** E-026
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

> _Generated from Morbius test cases (E-023 publish-back). 4 test case(s) sourced from `morbius:S-026-003`._

---

## Scope

Verification of S-026-003 acceptance criteria. 4 test case(s) span the happy path plus negative and edge variations.

## Prerequisites

- (Inherit from story Prerequisites; fill in environment + data setup before authoring)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 | TC-026-003-001 | ✓ |
| AC-002 | TC-026-003-002 | ✓ |
| AC-003 | TC-026-003-003 | ✓ |
| AC-004 | TC-026-003-004 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-026-003-001: Given S-026-001 (API spike) and S-026-002 (architecture decision) are

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

<!-- Morbius source: TC-MOR-026-003-1 (sourceChecksum=fd2124c45991cf3c) -->

**Preconditions:**
- (derived from story prerequisites — fill in or leave empty)

**Steps:**
1. S-026-001 (API spike) and S-026-002 (architecture decision) are both done
2. I implement the `managed-agents` mode in `src/runners/web-agent.ts`
3. `runAgentTask({mode:'managed-agents', prompt, mcps, allowedTools, timeoutMs})` returns a `AgentResult` with the same shape as CLI mode — same screenshots, same step log, same pass/fail signal — so the dashboard UI doesn't care which runner produced the result

**Expected Result:**
Given S-026-001 (API spike) and S-026-002 (architecture decision) are both done When I implement the `managed-agents` mode in `src/runners/web-agent.ts` Then `runAgentTask({mode:'managed-agents', prompt, mcps, allowedTools, timeoutMs})` returns a `AgentResult` with the same shape as CLI mode — same screenshots, same 

