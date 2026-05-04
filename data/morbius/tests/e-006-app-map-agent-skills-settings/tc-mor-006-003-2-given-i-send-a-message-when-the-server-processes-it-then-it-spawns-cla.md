---
id: TC-MOR-006-003-2
title: Given I send a message When the server processes it Then it spawns cla
category: e-006-app-map-agent-skills-settings
scenario: Negative
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
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-006-appmap-agent-skills/S-006-003-claude-chat-integration.md
  source_checksum: 8d407198acbc87c8
---
## Steps
1. **Setup:** I send a message
2. **Action:** the server processes it
3. **Assert:** it spawns `claude --model claude-sonnet-4-6 "<message>"` and streams stdout to the browser in real time (type: chunk/info/done/error)

## Expected Result
Given I send a message When the server processes it Then it spawns `claude --model claude-sonnet-4-6 "<message>"` and streams stdout to the browser in real time (type: chunk/info/done/error)

