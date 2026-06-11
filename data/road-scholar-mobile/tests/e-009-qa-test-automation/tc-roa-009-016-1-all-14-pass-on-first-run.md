---
id: TC-ROA-009-016-1
title: All 14 pass on first run
category: e-009-qa-test-automation
scenario: Happy Path
status: not-run
priority: P4
platforms:
  - android
  - ios
tags:
  - s-009-016
  - e-009
created: '2026-06-05'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-016
  ac_index: 0
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-016-implement-tf-006-anomaly.md
  source_checksum: ba1ab3383aeeda0d
---
## Steps
1. **Setup:** the 14 curated cases are implemented
2. **Action:** `yarn test:e2e:tf-006:curated` runs against Android
3. **Assert:** all 14 pass on first run

## Expected Result
**TC-009-016-001** Given the 14 curated cases are implemented, when `yarn test:e2e:tf-006:curated` runs against Android, then all 14 pass on first run

