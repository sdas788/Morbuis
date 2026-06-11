---
id: TC-ROA-009-011-1
title: All 3 happy-path journeys pass on first run
category: e-009-qa-test-automation
scenario: Happy Path
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-009-011
  - e-009
created: '2026-06-05'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-011
  ac_index: 0
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-011-implement-tf-003.md
  source_checksum: 1f126fc149e9f252
---
## Steps
1. **Setup:** a clean RC build and `rs-test-returning-participant` at baseline
2. **Action:** `yarn test:e2e:tf-003` runs
3. **Assert:** all 3 happy-path journeys pass on first run

## Expected Result
**TC-009-011-001** Given a clean RC build and `rs-test-returning-participant` at baseline, when `yarn test:e2e:tf-003` runs, then all 3 happy-path journeys pass on first run

