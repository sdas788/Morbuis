---
id: TC-MOR-006-003-3
title: Given I close the chat drawer while a response is streaming When the W
category: e-006-app-map-agent-skills-settings
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-006-003
  - e-006
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-006-003
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-006-appmap-agent-skills/S-006-003-claude-chat-integration.md
  source_checksum: 1590beb600739441
---
## Steps
1. **Setup:** I close the chat drawer while a response is streaming
2. **Action:** the WebSocket disconnects
3. **Assert:** the Claude process is killed (120s timeout also applies)

## Expected Result
Given I close the chat drawer while a response is streaming When the WebSocket disconnects Then the Claude process is killed (120s timeout also applies)

