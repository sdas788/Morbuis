---
id: TC-ROA-009-015-6
title: Teardown runs
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P4
platforms:
  - android
  - ios
tags:
  - s-009-015
  - e-009
created: '2026-06-05'
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-015
  ac_index: 5
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-015-implement-tf-005.md
  source_checksum: 14579d0fba299178
---
## Steps
1. **Setup:** TF-005 finishes
2. **Action:** teardown runs
3. **Assert:** the test device is restored to baseline (fresh access token + cleared AsyncStorage `recommendedVersion`)

## Expected Result
**TC-009-015-006** Given TF-005 finishes, when teardown runs, then the test device is restored to baseline (fresh access token + cleared AsyncStorage `recommendedVersion`)

