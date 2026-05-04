---
id: TC-MOR-024-007-1
title: Project-Type UI Signaling (Web vs Mobile vs API) — Test Plan
category: e-024-web-app-testing-via-browser-mcp
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-024-007
  - e-024
created: '2026-04-29'
updated: '2026-04-30'
pmagent_source:
  slug: morbius
  story_id: S-024-007
  ac_index: 0
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-024-web-app-testing/T-024-007-s-024-007-test-plan.md
  source_checksum: 2c18914168c704ae
---
## Steps
# Test Plan: Given I open a project with projectType

**ID:** T-024-007
**Project:** morbius
**Story:** S-024-007
**Epic:** E-024
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

> _Generated from Morbius test cases (E-023 publish-back). 3 test case(s) sourced from `morbius:S-024-007`._

---

## Scope

Verification of S-024-007 acceptance criteria. 3 test case(s) span the happy path plus negative and edge variations.

## Prerequisites

- (Inherit from story Prerequisites; fill in environment + data setup before authoring)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 | TC-024-007-001 (P0) | ✓ |
| AC-002 | TC-024-007-002 | ✓ |
| AC-003 | TC-024-007-003 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-024-007-001: Given I open a project with projectType: 'web' When the dashboard rend

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

<!-- Morbius source: TC-MOR-024-007-1 (sourceChecksum=0f6403444605c9b0) -->

**Preconditions:**
- (derived from story prerequisites — fill in or leave empty)

**Steps:**
1. I open a project with `projectType: 'web'`
2. the dashboard renders
3. every visible signal tells me it's web: the project pill has a purple accent + 🌐 WEB group label, the run-status section shows Playwright/Chrome/Target URL (not Maestro/Android/iOS), the topbar pills mirror that, irrelevant nav items (Devices, Maestro, Healing) are hidden, and each kanban card shows a 🌐 web badge

**Expected Result:**
Given I open a project with `projectType: 'web'` When the dashboard renders Then every visible signal tells me it's web: the project pill has a purple accent + 🌐 WEB group label, the run-status section shows Playwright/Chrome/Target URL (not Maestro/Android/iOS), the topbar pills mirror that, irrelevant nav items (Devices, Maestro, Healing) are hidden, and each kanban card shows a 🌐 web ba

## Expected Result
# Test Plan: Given I open a project with projectType

**ID:** T-024-007
**Project:** morbius
**Story:** S-024-007
**Epic:** E-024
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

> _Generated from Morbius test cases (E-023 publish-back). 3 test case(s) sourced from `morbius:S-024-007`._

---

## Scope

Verification of S-024-007 acceptance criteria. 3 test case(s) span the happy path plus negative and edge variations.

## Prerequisites

- (Inherit from story Prerequisites; fill in environment + data setup before authoring)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 | TC-024-007-001 (P0) | ✓ |
| AC-002 | TC-024-007-002 | ✓ |
| AC-003 | TC-024-007-003 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-024-007-001: Given I open a project with projectType: 'web' When the dashboard rend

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

<!-- Morbius source: TC-MOR-024-007-1 (sourceChecksum=0f6403444605c9b0) -->

**Preconditions:**
- (derived from story prerequisites — fill in or leave empty)

**Steps:**
1. I open a project with `projectType: 'web'`
2. the dashboard renders
3. every visible signal tells me it's web: the project pill has a purple accent + 🌐 WEB group label, the run-status section shows Playwright/Chrome/Target URL (not Maestro/Android/iOS), the topbar pills mirror that, irrelevant nav items (Devices, Maestro, Healing) are hidden, and each kanban card shows a 🌐 web badge

**Expected Result:**
Given I open a project with `projectType: 'web'` When the dashboard renders Then every visible signal tells me it's web: the project pill has a purple accent + 🌐 WEB group label, the run-status section shows Playwright/Chrome/Target URL (not Maestro/Android/iOS), the topbar pills mirror that, irrelevant nav items (Devices, Maestro, Healing) are hidden, and each kanban card shows a 🌐 web ba

