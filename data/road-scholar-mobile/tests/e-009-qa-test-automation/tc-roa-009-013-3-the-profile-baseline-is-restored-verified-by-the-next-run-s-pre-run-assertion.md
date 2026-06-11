---
id: TC-ROA-009-013-3
title: >-
  The profile baseline is restored (verified by the next run's pre-run
  assertion)
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-009-013
  - e-009
created: '2026-06-05'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-013
  ac_index: 2
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-013-tf-teardown-automation.md
  source_checksum: 85d3c102cd1bdf6e
---
## Steps
1. **Setup:** TF-003 mutated the profile during Journey A
2. **Action:** teardown runs
3. **Assert:** the profile baseline is restored (verified by the next run's pre-run assertion)

## Expected Result
**TC-009-013-003** Given TF-003 mutated the profile during Journey A, when teardown runs, then the profile baseline is restored (verified by the next run's pre-run assertion)

