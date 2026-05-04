---
id: TC-MOR-021-003-2
title: Given the schedule fires When Morbius is running Then the linked test
category: e-021-per-app-regression-wiki-drift-flag
scenario: Detour
status: not-run
priority: P4
platforms:
  - android
  - ios
tags:
  - s-021-003
  - e-021
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-021-003
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-021-per-app-regression-wiki/S-021-003-schedule-triggers.md
  source_checksum: 5781230ac2a8c8c4
---
## Steps
1. **Setup:** the schedule fires
2. **Action:** Morbius is running
3. **Assert:** the linked test suites are queued for execution; a run entry is created tagged `regression-run: true`

## Expected Result
Given the schedule fires When Morbius is running Then the linked test suites are queued for execution; a run entry is created tagged `regression-run: true`

