---
id: TC-MOR-019-001-2
title: Given the token is stored When the connection panel re-renders Then th
category: e-019-google-sheets-bidirectional-sync
scenario: Detour
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-019-001
  - e-019
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-019-001
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-019-google-sheets-sync/S-019-001-google-oauth.md
  source_checksum: 3ba43a5523c1d81a
---
## Steps
1. **Setup:** the token is stored
2. **Action:** the connection panel re-renders
3. **Assert:** the connected account email is displayed with a "Disconnect" button

## Expected Result
Given the token is stored When the connection panel re-renders Then the connected account email is displayed with a "Disconnect" button

