---
id: TC-MOR-006-005-3
title: Given the mediaPath is outside the project root When media is served T
category: e-006-app-map-agent-skills-settings
scenario: Detour
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-006-005
  - e-006
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-006-005
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-006-appmap-agent-skills/S-006-005-run-media-viewer.md
  source_checksum: 58d8e03da0da63c7
---
## Steps
1. **Setup:** the `mediaPath` is outside the project root
2. **Action:** media is served
3. **Assert:** it is served via `GET /media/<path>` (not `GET /screenshots/<path>`) to avoid path conflicts ---

## Expected Result
Given the `mediaPath` is outside the project root When media is served Then it is served via `GET /media/<path>` (not `GET /screenshots/<path>`) to avoid path conflicts ---

