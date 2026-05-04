---
id: TC-MOR-019-004-2
title: Given the push succeeds When the next pull runs Then the change is not
category: e-019-google-sheets-bidirectional-sync
scenario: Detour
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-019-004
  - e-019
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-019-004
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-019-google-sheets-sync/S-019-004-push-back.md
  source_checksum: 5128645309b1b37e
---
## Steps
1. **Setup:** the push succeeds
2. **Action:** the next pull runs
3. **Assert:** the change is not re-applied as a conflict (timestamp matches)

## Expected Result
Given the push succeeds When the next pull runs Then the change is not re-applied as a conflict (timestamp matches)

