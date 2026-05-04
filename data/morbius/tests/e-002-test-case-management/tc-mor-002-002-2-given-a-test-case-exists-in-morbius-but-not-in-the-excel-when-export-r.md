---
id: TC-MOR-002-002-2
title: Given a test case exists in Morbius but not in the Excel When export r
category: e-002-test-case-management
scenario: Detour
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-002-002
  - e-002
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-002-002
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-002-test-case-management/S-002-002-export-to-excel.md
  source_checksum: 07166ef3bda511b5
---
## Steps
1. **Setup:** a test case exists in Morbius but not in the Excel
2. **Action:** export runs
3. **Assert:** that test is skipped (no new rows are inserted)

## Expected Result
Given a test case exists in Morbius but not in the Excel When export runs Then that test is skipped (no new rows are inserted)

