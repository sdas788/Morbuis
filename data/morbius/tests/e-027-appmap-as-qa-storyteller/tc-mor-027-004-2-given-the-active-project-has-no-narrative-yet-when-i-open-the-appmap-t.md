---
id: TC-MOR-027-004-2
title: Given the active project has no narrative yet When I open the AppMap t
category: e-027-appmap-as-qa-storyteller
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-027-004
  - e-027
created: '2026-05-04'
updated: '2026-05-04'
pmagent_source:
  slug: morbius
  story_id: S-027-004
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-027-appmap-storyteller/S-027-004-tab-ui-3-layer.md
  source_checksum: 565e1dd0a0b11c08
---
## Steps
1. **Setup:** the active project has no narrative yet
2. **Action:** I open the AppMap tab
3. **Assert:** the chart still renders and the narrative section shows a "Generate narrative — explain why these flows are automated" CTA button calling `POST /api/appmap/narrative/generate`

## Expected Result
Given the active project has no narrative yet When I open the AppMap tab Then the chart still renders and the narrative section shows a "Generate narrative — explain why these flows are automated" CTA button calling `POST /api/appmap/narrative/generate`

