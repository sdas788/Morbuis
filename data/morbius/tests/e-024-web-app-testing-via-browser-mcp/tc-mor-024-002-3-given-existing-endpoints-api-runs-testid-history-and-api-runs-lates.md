---
id: TC-MOR-024-002-3
title: 'Given existing endpoints /api/runs/:testId/history and /api/runs/lates'
category: e-024-web-app-testing-via-browser-mcp
scenario: Detour
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-024-002
  - e-024
created: '2026-04-29'
updated: '2026-04-29'
pmagent_source:
  slug: morbius
  story_id: S-024-002
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-024-web-app-testing/S-024-002-generic-run-record.md
  source_checksum: f32aa658111182a1
---
## Steps
1. **Setup:** existing endpoints `/api/runs/:testId/history` and `/api/runs/latest-all`
2. **Action:** they return a mix of Maestro and web records
3. **Assert:** both render correctly in the UI without errors ---

## Expected Result
Given existing endpoints `/api/runs/:testId/history` and `/api/runs/latest-all` When they return a mix of Maestro and web records Then both render correctly in the UI without errors ---

