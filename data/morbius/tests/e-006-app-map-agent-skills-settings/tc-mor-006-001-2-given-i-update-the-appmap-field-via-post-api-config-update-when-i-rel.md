---
id: TC-MOR-006-001-2
title: Given I update the appMap field via POST /api/config/update When I rel
category: e-006-app-map-agent-skills-settings
scenario: Detour
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-006-001
  - e-006
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-006-001
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-006-appmap-agent-skills/S-006-001-app-navigation-map.md
  source_checksum: 41987dcaeeddeb34
---
## Steps
1. **Setup:** I update the `appMap` field via `POST /api/config/update`
2. **Action:** I reload
3. **Assert:** the new chart is displayed immediately

## Expected Result
Given I update the `appMap` field via `POST /api/config/update` When I reload Then the new chart is displayed immediately

