---
id: TC-ROA-009-012-1
title: 'Yarn test:e2e:tf-004 runs'
category: e-009-qa-test-automation
scenario: Happy Path
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-009-012
  - e-009
created: '2026-06-05'
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-012
  ac_index: 0
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-012-implement-tf-004.md
  source_checksum: ed9554b17537a0c4
---
## Steps
1. **Setup:** a clean RC build and `rs-test-leader-with-verint` at baseline (0 leader groups)
2. **Action:** `yarn test:e2e:tf-004` runs
3. **Assert:** Journey A passes on first run

## Expected Result
**TC-009-012-001** Given a clean RC build and `rs-test-leader-with-verint` at baseline (0 leader groups), when `yarn test:e2e:tf-004` runs, then Journey A passes on first run

