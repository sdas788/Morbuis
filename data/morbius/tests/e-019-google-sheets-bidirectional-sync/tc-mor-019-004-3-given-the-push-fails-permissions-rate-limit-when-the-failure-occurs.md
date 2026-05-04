---
id: TC-MOR-019-004-3
title: 'Given the push fails (permissions, rate limit) When the failure occurs'
category: e-019-google-sheets-bidirectional-sync
scenario: Edge Case
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
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-019-google-sheets-sync/S-019-004-push-back.md
  source_checksum: ff08d0cd19fa945a
---
## Steps
1. **Setup:** the push fails (permissions, rate limit)
2. **Action:** the failure occurs
3. **Assert:** the change is queued for retry (same pattern as E-013 replay queue) and the health panel shows pending pushes ---

## Expected Result
Given the push fails (permissions, rate limit) When the failure occurs Then the change is queued for retry (same pattern as E-013 replay queue) and the health panel shows pending pushes ---

