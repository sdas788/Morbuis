---
id: TC-MOR-001-003-2
title: Given a new project is created When I run POST /api/projects/create Th
category: e-001-core-dashboard-data-foundation
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-001-003
  - e-001
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-001-003
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-001-core-dashboard-foundation/S-001-003-multi-project-registry.md
  source_checksum: 2511a421f2a05a19
---
## Steps
1. **Setup:** a new project is created
2. **Action:** I run `POST /api/projects/create`
3. **Assert:** a new folder is created under `data/` with config.json and empty test/bug/runs directories

## Expected Result
Given a new project is created When I run `POST /api/projects/create` Then a new folder is created under `data/` with config.json and empty test/bug/runs directories

