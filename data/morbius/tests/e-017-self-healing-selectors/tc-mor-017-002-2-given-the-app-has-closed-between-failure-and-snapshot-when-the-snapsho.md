---
id: TC-MOR-017-002-2
title: Given the app has closed between failure and snapshot When the snapsho
category: e-017-self-healing-selectors
scenario: Detour
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-017-002
  - e-017
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-017-002
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-017-self-healing-selectors/S-017-002-hierarchy-snapshot.md
  source_checksum: 64f78be147e905a5
---
## Steps
1. **Setup:** the app has closed between failure and snapshot
2. **Action:** the snapshot is requested
3. **Assert:** the pipeline launches the app to the relevant screen using the flow's prior steps (up to the failure step)

## Expected Result
Given the app has closed between failure and snapshot When the snapshot is requested Then the pipeline launches the app to the relevant screen using the flow's prior steps (up to the failure step)

