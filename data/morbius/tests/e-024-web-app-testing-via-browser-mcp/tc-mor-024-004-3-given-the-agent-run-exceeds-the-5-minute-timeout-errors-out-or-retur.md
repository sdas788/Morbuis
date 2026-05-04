---
id: TC-MOR-024-004-3
title: 'Given the agent run exceeds the 5-minute timeout, errors out, or retur'
category: e-024-web-app-testing-via-browser-mcp
scenario: Negative
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
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-024-web-app-testing/S-024-004-web-runner-playwright-mcp.md
  source_checksum: dfad3021890b94e4
---
## Steps
1. **Setup:** the agent run exceeds the 5-minute timeout, errors out, or returns malformed JSON
2. **Action:** the failure is detected
3. **Assert:** the run record persists with `status: 'error'` + `errorLine` populated, and the prior pass history is unaffected

## Expected Result
Given the agent run exceeds the 5-minute timeout, errors out, or returns malformed JSON When the failure is detected Then the run record persists with `status: 'error'` + `errorLine` populated, and the prior pass history is unaffected

