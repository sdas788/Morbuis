---
id: TC-ROA-009-012-5
title: Rs-test-leader-with-verint is restored to 0 leader groups (verifies the regen…
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-009-012
  - e-009
created: '2026-06-05'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-012
  ac_index: 4
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-012-implement-tf-004.md
  source_checksum: a45e49400a5f470a
---
## Steps
1. **Setup:** the suite finishes
2. **Action:** nightly regen runs
3. **Assert:** `rs-test-leader-with-verint` is restored to 0 leader groups (verifies the regen contract)

## Expected Result
**TC-009-012-005** Given the suite finishes, when nightly regen runs, then `rs-test-leader-with-verint` is restored to 0 leader groups (verifies the regen contract)

