---
id: TC-MOR-006-004-2
title: Given I update the Android Maestro path in Settings When I save Then P
category: e-006-app-map-agent-skills-settings
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-006-004
  - e-006
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-006-004
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-006-appmap-agent-skills/S-006-004-settings-page.md
  source_checksum: 79ce4aa92ffc41c1
---
## Steps
1. **Setup:** I update the Android Maestro path in Settings
2. **Action:** I save
3. **Assert:** `POST /api/config/update` writes the new path to `config.json` and the Maestro tab reloads with the new path

## Expected Result
Given I update the Android Maestro path in Settings When I save Then `POST /api/config/update` writes the new path to `config.json` and the Maestro tab reloads with the new path

