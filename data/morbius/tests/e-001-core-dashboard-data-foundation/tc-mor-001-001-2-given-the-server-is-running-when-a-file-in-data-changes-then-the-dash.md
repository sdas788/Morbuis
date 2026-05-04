---
id: TC-MOR-001-001-2
title: Given the server is running When a file in data/ changes Then the dash
category: e-001-core-dashboard-data-foundation
scenario: Detour
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-001-001
  - e-001
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-001-001
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-001-core-dashboard-foundation/S-001-001-server-dashboard-shell.md
  source_checksum: ddc1c0759e71d6bb
---
## Steps
1. **Setup:** the server is running
2. **Action:** a file in `data/` changes
3. **Assert:** the dashboard reflects updated data on next API call (file-based, no caching layer)

## Expected Result
Given the server is running When a file in `data/` changes Then the dashboard reflects updated data on next API call (file-based, no caching layer)

