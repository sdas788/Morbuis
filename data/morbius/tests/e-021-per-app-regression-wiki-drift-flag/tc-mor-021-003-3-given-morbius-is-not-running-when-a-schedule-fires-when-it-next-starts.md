---
id: TC-MOR-021-003-3
title: Given Morbius is not running when a schedule fires When it next starts
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
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-021-per-app-regression-wiki/S-021-003-schedule-triggers.md
  source_checksum: 7adc6bf6bd8d9162
---
## Steps
1. **Setup:** Morbius is not running
2. **Action:** a schedule fires When it next starts up
3. **Assert:** the missed run is detected and surfaced as a notification, not silently skipped ---

## Expected Result
Given Morbius is not running when a schedule fires When it next starts up Then the missed run is detected and surfaced as a notification, not silently skipped ---

