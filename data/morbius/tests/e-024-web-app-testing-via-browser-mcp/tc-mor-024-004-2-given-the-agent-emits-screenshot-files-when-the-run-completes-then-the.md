---
id: TC-MOR-024-004-2
title: Given the agent emits screenshot files When the run completes Then the
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
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-024-web-app-testing/S-024-004-web-runner-playwright-mcp.md
  source_checksum: 5ee127a59abcd78b
---
## Steps
1. **Setup:** the agent emits screenshot files
2. **Action:** the run completes
3. **Assert:** the screenshots are persisted under `data/{projectId}/runs/<runId>/` and referenced via `RunRecord.screenshots[]` so the TestDrawer history can render them

## Expected Result
Given the agent emits screenshot files When the run completes Then the screenshots are persisted under `data/{projectId}/runs/<runId>/` and referenced via `RunRecord.screenshots[]` so the TestDrawer history can render them

