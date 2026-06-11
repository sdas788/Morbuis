---
id: TC-ROA-009-003-1
title: Both Journey A + B pass end-to-end on first run
category: e-009-qa-test-automation
scenario: Happy Path
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-009-003
  - e-009
created: '2026-06-05'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-003
  ac_index: 0
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-003-implement-tf-001.md
  source_checksum: e0c25e31f75a9362
---
## Steps
1. **Setup:** a clean RC build and `rs-test-fresh-participant` at baseline (S-009-002)
2. **Action:** `yarn test:e2e:tf-001` runs against Android emulator
3. **Assert:** both Journey A + B pass end-to-end on first run

## Expected Result
**TC-009-003-001** Given a clean RC build and `rs-test-fresh-participant` at baseline (S-009-002), when `yarn test:e2e:tf-001` runs against Android emulator, then both Journey A + B pass end-to-end on first run

