---
id: TC-MOR-003-003-3
title: Given I close the browser tab while a run is active When the WebSocket
category: e-003-test-execution-maestro-integration
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-003-003
  - e-003
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-003-003
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-003-test-execution-maestro/S-003-003-live-output-streaming.md
  source_checksum: 70d6365dcb5f42e7
---
## Steps
1. **Setup:** I close the browser tab while a run is active
2. **Action:** the WebSocket disconnects
3. **Assert:** the Maestro process continues running (not killed on disconnect) ---

## Expected Result
Given I close the browser tab while a run is active When the WebSocket disconnects Then the Maestro process continues running (not killed on disconnect) ---

