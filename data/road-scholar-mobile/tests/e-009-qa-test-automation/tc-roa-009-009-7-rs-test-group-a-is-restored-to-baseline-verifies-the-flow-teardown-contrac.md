---
id: TC-ROA-009-009-7
title: RS-TEST-GROUP-A is restored to baseline (verifies the flow + teardown contrac…
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-009-009
  - e-009
created: '2026-06-05'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-009
  ac_index: 6
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-009-implement-tf-002.md
  source_checksum: 48c07608acf67176
---
## Steps
1. **Setup:** the suite finishes
2. **Action:** nightly regen runs the next morning
3. **Assert:** RS-TEST-GROUP-A is restored to baseline (verifies the flow + teardown contract: flows mutate; cron cleans up)

## Expected Result
**TC-009-009-007** Given the suite finishes, when nightly regen runs the next morning, then RS-TEST-GROUP-A is restored to baseline (verifies the flow + teardown contract: flows mutate; cron cleans up)

