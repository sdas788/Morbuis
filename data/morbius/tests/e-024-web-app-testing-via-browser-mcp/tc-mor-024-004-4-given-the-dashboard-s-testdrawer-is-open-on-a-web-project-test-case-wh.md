---
id: TC-MOR-024-004-4
title: Given the dashboard's TestDrawer is open on a web-project test case Wh
category: e-024-web-app-testing-via-browser-mcp
scenario: Detour
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-024-004
  - e-024
created: '2026-04-29'
updated: '2026-04-29'
pmagent_source:
  slug: morbius
  story_id: S-024-004
  ac_index: 3
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-024-web-app-testing/S-024-004-web-runner-playwright-mcp.md
  source_checksum: 6e3341a769b09af5
---
## Steps
1. **Setup:** the dashboard's TestDrawer is open on a web-project test case
2. **Action:** it renders
3. **Assert:** the Run section shows a primary "Run headless" button (and gates the existing Android/iOS buttons off when `projectType === 'web'`); clicking it fires the new endpoint and refreshes Run History

## Expected Result
Given the dashboard's TestDrawer is open on a web-project test case When it renders Then the Run section shows a primary "Run headless" button (and gates the existing Android/iOS buttons off when `projectType === 'web'`); clicking it fires the new endpoint and refreshes Run History

