---
id: TC-MOR-024-008-2
title: Given the same project type is web When the Dashboard renders the Cove
category: e-024-web-app-testing-via-browser-mcp
scenario: Detour
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-024-008
  - e-024
created: '2026-04-29'
updated: '2026-04-29'
pmagent_source:
  slug: morbius
  story_id: S-024-008
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-024-web-app-testing/S-024-008-ui-polish-round-2.md
  source_checksum: b011944d5d3cf181
---
## Steps
1. **Setup:** the same project type is `web`
2. **Action:** the Dashboard renders the Coverage stat card
3. **Assert:** the small pills under the percentage show `Headless` + `Visual` (purple) instead of `Android · iOS`; for `mobile` the original `Android · iOS` pill is preserved; for `api` a muted "API · v1 not implemented" placeholder appears

## Expected Result
Given the same project type is `web` When the Dashboard renders the Coverage stat card Then the small pills under the percentage show `Headless` + `Visual` (purple) instead of `Android · iOS`; for `mobile` the original `Android · iOS` pill is preserved; for `api` a muted "API · v1 not implemented" placeholder appears

