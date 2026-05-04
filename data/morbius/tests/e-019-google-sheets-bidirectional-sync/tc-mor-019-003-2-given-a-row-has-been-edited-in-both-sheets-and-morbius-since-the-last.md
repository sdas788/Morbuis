---
id: TC-MOR-019-003-2
title: Given a row has been edited in both Sheets and Morbius since the last
category: e-019-google-sheets-bidirectional-sync
scenario: Detour
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
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-019-google-sheets-sync/S-019-003-poll-based-pull.md
  source_checksum: 27fd721dfbeff4aa
---
## Steps
1. **Setup:** a row has been edited in both Sheets and Morbius since the last sync
2. **Action:** conflict is detected
3. **Assert:** the timestamp rule applies: whichever side's `updated` timestamp is newer wins; the losing edit is logged to changelog as "sheets-conflict-resolved"

## Expected Result
Given a row has been edited in both Sheets and Morbius since the last sync When conflict is detected Then the timestamp rule applies: whichever side's `updated` timestamp is newer wins; the losing edit is logged to changelog as "sheets-conflict-resolved"

