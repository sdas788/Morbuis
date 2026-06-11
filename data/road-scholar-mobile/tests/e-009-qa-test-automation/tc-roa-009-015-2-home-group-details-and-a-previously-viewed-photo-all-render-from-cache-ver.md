---
id: TC-ROA-009-015-2
title: 'Home, Group Details, and a previously-viewed photo all render from cache (ver…'
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
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-015
  ac_index: 1
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-015-implement-tf-005.md
  source_checksum: 86230a87e4268c1b
---
## Steps
1. **Setup:** Journey A's warm-up + cold-start sequence
2. **Action:** the cold-start flow runs against a previously-populated cache
3. **Assert:** Home, Group Details, and a previously-viewed photo all render from cache (verifies redux-persist rehydration end-to-end)

## Expected Result
**TC-009-015-002** Given Journey A's warm-up + cold-start sequence, when the cold-start flow runs against a previously-populated cache, then Home, Group Details, and a previously-viewed photo all render from cache (verifies redux-persist rehydration end-to-end)

