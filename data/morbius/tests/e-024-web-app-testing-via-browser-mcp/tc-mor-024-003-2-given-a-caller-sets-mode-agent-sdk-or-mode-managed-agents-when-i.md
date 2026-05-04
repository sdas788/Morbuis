---
id: TC-MOR-024-003-2
title: 'Given a caller sets mode: ''agent-sdk'' or mode: ''managed-agents'' When i'
category: e-024-web-app-testing-via-browser-mcp
scenario: Negative
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-024-003
  - e-024
created: '2026-04-29'
updated: '2026-04-29'
pmagent_source:
  slug: morbius
  story_id: S-024-003
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-024-web-app-testing/S-024-003-run-agent-task-chokepoint.md
  source_checksum: 7d958d9f4da3c662
---
## Steps
1. **Setup:** a caller sets `mode: 'agent-sdk'` or `mode: 'managed-agents'`
2. **Action:** invoked
3. **Assert:** the function throws a clear "not enabled — see arch.md Production Deployment" error (commented stub showing the future call shape stays in source for the eventual swap)

## Expected Result
Given a caller sets `mode: 'agent-sdk'` or `mode: 'managed-agents'` When invoked Then the function throws a clear "not enabled — see arch.md Production Deployment" error (commented stub showing the future call shape stays in source for the eventual swap)

