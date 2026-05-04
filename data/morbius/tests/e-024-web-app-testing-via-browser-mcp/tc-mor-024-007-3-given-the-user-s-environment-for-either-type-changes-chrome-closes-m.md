---
id: TC-MOR-024-007-3
title: 'Given the user''s environment for either type changes (Chrome closes, M'
category: e-024-web-app-testing-via-browser-mcp
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-024-007
  - e-024
created: '2026-04-29'
updated: '2026-04-29'
pmagent_source:
  slug: morbius
  story_id: S-024-007
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-024-web-app-testing/S-024-007-project-type-ui-signaling.md
  source_checksum: 162a8e08410c3a86
---
## Steps
1. **Setup:** the user's environment for either type changes (Chrome closes, Maestro disconnects, target URL drops)
2. **Action:** the run-status section refreshes (existing 15s poll)
3. **Assert:** the dot for the affected check flips to fail with a useful detail string ---

## Expected Result
Given the user's environment for either type changes (Chrome closes, Maestro disconnects, target URL drops) When the run-status section refreshes (existing 15s poll) Then the dot for the affected check flips to fail with a useful detail string ---

