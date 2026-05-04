---
id: TC-MOR-019-003-3
title: Given the Sheets API returns an error When polling runs Then the error
category: e-019-google-sheets-bidirectional-sync
scenario: Negative
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-019-003
  - e-019
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-019-003
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-019-google-sheets-sync/S-019-003-poll-based-pull.md
  source_checksum: b5d049fa910ad576
---
## Steps
1. **Setup:** the Sheets API returns an error
2. **Action:** polling runs
3. **Assert:** the error is logged to the Google Sheets health panel; next poll retries; no data is corrupted ---

## Expected Result
Given the Sheets API returns an error When polling runs Then the error is logged to the Google Sheets health panel; next poll retries; no data is corrupted ---

