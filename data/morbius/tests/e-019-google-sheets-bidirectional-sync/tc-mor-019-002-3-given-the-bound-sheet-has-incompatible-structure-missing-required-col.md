---
id: TC-MOR-019-002-3
title: Given the bound sheet has incompatible structure (missing required col
category: e-019-google-sheets-bidirectional-sync
scenario: Negative
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-019-002
  - e-019
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-019-002
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-019-google-sheets-sync/S-019-002-sheet-binding.md
  source_checksum: 98dce92f67926a52
---
## Steps
1. **Setup:** the bound sheet has incompatible structure (missing required columns)
2. **Action:** validation runs
3. **Assert:** a clear error is shown listing missing columns; sync is not enabled ---

## Expected Result
Given the bound sheet has incompatible structure (missing required columns) When validation runs Then a clear error is shown listing missing columns; sync is not enabled ---

