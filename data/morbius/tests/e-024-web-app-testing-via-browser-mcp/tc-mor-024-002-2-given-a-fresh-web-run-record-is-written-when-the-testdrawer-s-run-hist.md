---
id: TC-MOR-024-002-2
title: Given a fresh web run record is written When the TestDrawer's Run Hist
category: e-024-web-app-testing-via-browser-mcp
scenario: Negative
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
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-024-web-app-testing/S-024-002-generic-run-record.md
  source_checksum: 71ad1c10a51bf295
---
## Steps
1. **Setup:** a fresh web run record is written
2. **Action:** the TestDrawer's Run History section renders it
3. **Assert:** it shows `targetUrl` + screenshot count instead of failing-step/error-line, and the runner type appears as a small badge (`web-headless` / `web-visual` / `maestro`)

## Expected Result
Given a fresh web run record is written When the TestDrawer's Run History section renders it Then it shows `targetUrl` + screenshot count instead of failing-step/error-line, and the runner type appears as a small badge (`web-headless` / `web-visual` / `maestro`)

