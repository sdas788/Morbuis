---
id: TC-MOR-024-003-1
title: '`runAgentTask` Chokepoint + Production-Path Stub — Test Plan'
category: e-024-web-app-testing-via-browser-mcp
scenario: Negative
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-024-003
  - e-024
created: '2026-04-29'
updated: '2026-04-30'
pmagent_source:
  slug: morbius
  story_id: S-024-003
  ac_index: 0
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-024-web-app-testing/T-024-003-s-024-003-test-plan.md
  source_checksum: d6eafe8aa2a455ec
---
## Steps
# Test Plan: Given the new module src/runners/web-agent

**ID:** T-024-003
**Project:** morbius
**Story:** S-024-003
**Epic:** E-024
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

> _Generated from Morbius test cases (E-023 publish-back). 3 test case(s) sourced from `morbius:S-024-003`._

---

## Scope

Verification of S-024-003 acceptance criteria. 3 test case(s) span the happy path plus negative and edge variations.

## Prerequisites

- (Inherit from story Prerequisites; fill in environment + data setup before authoring)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 | TC-024-003-001 | ✓ |
| AC-002 | TC-024-003-002 | ✓ |
| AC-003 | TC-024-003-003 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-024-003-001: Given the new module src/runners/web-agent.ts exports runAgentTask({mo

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

<!-- Morbius source: TC-MOR-024-003-1 (sourceChecksum=baad5baea070f45b) -->

**Preconditions:**
- (derived from story prerequisites — fill in or leave empty)

**Steps:**
1. the new module `src/runners/web-agent.ts` exports `runAgentTask({mode, prompt, mcps, timeoutMs}): Promise<AgentResult>`
2. v1 callers invoke it with `mode: 'cli-subprocess'` (default)
3. the function spawns `claude --print --model claude-sonnet-4-6` with the requested MCP allowlist, captures stdout, optionally JSON-parses via `extractJson`, and returns `{ok, text, json?, durationMs, error?}`

**Expected Result:**
Given the new module `src/runners/web-agent.ts` exports `runAgentTask({mode, prompt, mcps, timeoutMs}): Promise<AgentResult>` When v1 callers invoke it with `mode: 'cli-subprocess'` (default) Then the function spawns `claude --print --model claude-sonnet-4-6` with the requested MCP allowlist, captures stdout, optionally JSON-parses via `extractJson`, and returns `{ok, text, json?, durat

## Expected Result
# Test Plan: Given the new module src/runners/web-agent

**ID:** T-024-003
**Project:** morbius
**Story:** S-024-003
**Epic:** E-024
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

> _Generated from Morbius test cases (E-023 publish-back). 3 test case(s) sourced from `morbius:S-024-003`._

---

## Scope

Verification of S-024-003 acceptance criteria. 3 test case(s) span the happy path plus negative and edge variations.

## Prerequisites

- (Inherit from story Prerequisites; fill in environment + data setup before authoring)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 | TC-024-003-001 | ✓ |
| AC-002 | TC-024-003-002 | ✓ |
| AC-003 | TC-024-003-003 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-024-003-001: Given the new module src/runners/web-agent.ts exports runAgentTask({mo

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

<!-- Morbius source: TC-MOR-024-003-1 (sourceChecksum=baad5baea070f45b) -->

**Preconditions:**
- (derived from story prerequisites — fill in or leave empty)

**Steps:**
1. the new module `src/runners/web-agent.ts` exports `runAgentTask({mode, prompt, mcps, timeoutMs}): Promise<AgentResult>`
2. v1 callers invoke it with `mode: 'cli-subprocess'` (default)
3. the function spawns `claude --print --model claude-sonnet-4-6` with the requested MCP allowlist, captures stdout, optionally JSON-parses via `extractJson`, and returns `{ok, text, json?, durationMs, error?}`

**Expected Result:**
Given the new module `src/runners/web-agent.ts` exports `runAgentTask({mode, prompt, mcps, timeoutMs}): Promise<AgentResult>` When v1 callers invoke it with `mode: 'cli-subprocess'` (default) Then the function spawns `claude --print --model claude-sonnet-4-6` with the requested MCP allowlist, captures stdout, optionally JSON-parses via `extractJson`, and returns `{ok, text, json?, durat

