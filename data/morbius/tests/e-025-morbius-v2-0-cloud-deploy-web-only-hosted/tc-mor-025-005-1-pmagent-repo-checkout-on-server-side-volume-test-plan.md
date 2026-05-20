---
id: TC-MOR-025-005-1
title: PMAgent Repo Checkout on Server-Side Volume — Test Plan
category: e-025-morbius-v2-0-cloud-deploy-web-only-hosted
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-025-005
  - e-025
created: '2026-04-30'
updated: '2026-05-04'
pmagent_source:
  slug: morbius
  story_id: S-025-005
  ac_index: 0
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-025-cloud-deploy/T-025-005-s-025-005-test-plan.md
  source_checksum: 2c29ca93240f8dc1
---
## Steps
# Test Plan: Given the Fly app is configured with PMAGENTREPOURL, PMAGENTREPOBRANCH

**ID:** T-025-005
**Project:** morbius
**Story:** S-025-005
**Epic:** E-025
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

> _Generated from Morbius test cases (E-023 publish-back). 4 test case(s) sourced from `morbius:S-025-005`._

---

## Scope

Verification of S-025-005 acceptance criteria. 4 test case(s) span the happy path plus negative and edge variations.

## Prerequisites

- (Inherit from story Prerequisites; fill in environment + data setup before authoring)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 | TC-025-005-001 (P0) | ✓ |
| AC-002 | TC-025-005-002 | ✓ |
| AC-003 | TC-025-005-003 | ✓ |
| AC-004 | TC-025-005-004 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-025-005-001: Given the Fly app is configured with PMAGENTREPOURL, PMAGENTREPOBRANCH

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

<!-- Morbius source: TC-MOR-025-005-1 (sourceChecksum=6bd79f33a771fba0) -->

**Preconditions:**
- (derived from story prerequisites — fill in or leave empty)

**Steps:**
1. the Fly app is configured with `PMAGENT_REPO_URL`, `PMAGENT_REPO_BRANCH`, and (for private repos) a deploy key or fine-scoped GitHub PAT as Fly secrets
2. the container starts via `scripts/cloud-bootstrap.sh`
3. the bootstrap clones the PMAgent repo to `/data/pmagent-checkout/` if absent, or `git pull`s it if present, then exec's the server with `PMAGENT_HOME=/data/pmagent-checkout` set so `src/parsers/pmagent.ts` finds projects there without code changes

**Expected Result:**
Given the Fly app is configured with `PMAGENT_REPO_URL`, `PMAGENT_REPO_BRANCH`, and (for private repos) a deploy key or fine-scoped GitHub PAT as Fly secrets When the container starts via `scripts/cloud-bootstrap.sh` Then the bootstrap clones the PMAgent repo

## Expected Result
# Test Plan: Given the Fly app is configured with PMAGENTREPOURL, PMAGENTREPOBRANCH

**ID:** T-025-005
**Project:** morbius
**Story:** S-025-005
**Epic:** E-025
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

> _Generated from Morbius test cases (E-023 publish-back). 4 test case(s) sourced from `morbius:S-025-005`._

---

## Scope

Verification of S-025-005 acceptance criteria. 4 test case(s) span the happy path plus negative and edge variations.

## Prerequisites

- (Inherit from story Prerequisites; fill in environment + data setup before authoring)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 | TC-025-005-001 (P0) | ✓ |
| AC-002 | TC-025-005-002 | ✓ |
| AC-003 | TC-025-005-003 | ✓ |
| AC-004 | TC-025-005-004 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-025-005-001: Given the Fly app is configured with PMAGENTREPOURL, PMAGENTREPOBRANCH

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

<!-- Morbius source: TC-MOR-025-005-1 (sourceChecksum=6bd79f33a771fba0) -->

**Preconditions:**
- (derived from story prerequisites — fill in or leave empty)

**Steps:**
1. the Fly app is configured with `PMAGENT_REPO_URL`, `PMAGENT_REPO_BRANCH`, and (for private repos) a deploy key or fine-scoped GitHub PAT as Fly secrets
2. the container starts via `scripts/cloud-bootstrap.sh`
3. the bootstrap clones the PMAgent repo to `/data/pmagent-checkout/` if absent, or `git pull`s it if present, then exec's the server with `PMAGENT_HOME=/data/pmagent-checkout` set so `src/parsers/pmagent.ts` finds projects there without code changes

**Expected Result:**
Given the Fly app is configured with `PMAGENT_REPO_URL`, `PMAGENT_REPO_BRANCH`, and (for private repos) a deploy key or fine-scoped GitHub PAT as Fly secrets When the container starts via `scripts/cloud-bootstrap.sh` Then the bootstrap clones the PMAgent repo

