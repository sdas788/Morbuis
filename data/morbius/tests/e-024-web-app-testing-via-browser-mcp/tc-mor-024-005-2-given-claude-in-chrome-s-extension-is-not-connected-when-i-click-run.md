---
id: TC-MOR-024-005-2
title: Given Claude in Chrome's extension is not connected When I click "Run
category: e-024-web-app-testing-via-browser-mcp
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-024-005
  - e-024
created: '2026-04-29'
updated: '2026-04-29'
pmagent_source:
  slug: morbius
  story_id: S-024-005
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-024-web-app-testing/S-024-005-visual-claude-in-chrome.md
  source_checksum: 889c081602235524
---
## Steps
1. **Setup:** Claude in Chrome's extension is not connected
2. **Action:** I click "Run visual"
3. **Assert:** the run fails fast with a clear "Visual mode needs Claude in Chrome connected — open the extension first" error, and no run record is written

## Expected Result
Given Claude in Chrome's extension is not connected When I click "Run visual" Then the run fails fast with a clear "Visual mode needs Claude in Chrome connected — open the extension first" error, and no run record is written

