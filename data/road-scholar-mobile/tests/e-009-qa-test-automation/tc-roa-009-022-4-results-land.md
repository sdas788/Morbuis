---
id: TC-ROA-009-022-4
title: Results land
category: e-009-qa-test-automation
scenario: Negative
status: not-run
priority: P4
platforms:
  - android
  - ios
tags:
  - s-009-022
  - e-009
created: '2026-06-05'
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-022
  ac_index: 3
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-022-faker-fuzz-harness.md
  source_checksum: 8ed54aeb8a7a05fa
---
## Steps
1. **Setup:** the nightly Cloud run completes
2. **Action:** results land
3. **Assert:** the run summary includes the seed + total cases run + pass/fail counts per surface

## Expected Result
**TC-009-022-004** Given the nightly Cloud run completes, when results land, then the run summary includes the seed + total cases run + pass/fail counts per surface

