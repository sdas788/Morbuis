---
id: TC-MOR-025-002-1
title: Given the env var MORBIUSDATADIR=/tmp/morbius-test is set When the ser
category: e-025-morbius-v2-0-cloud-deploy-web-only-hosted
scenario: Happy Path
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-025-002
  - e-025
created: '2026-04-30'
updated: '2026-04-30'
pmagent_source:
  slug: morbius
  story_id: S-025-002
  ac_index: 0
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-025-cloud-deploy/S-025-002-persistent-storage-data-path.md
  source_checksum: 85bb0315217bd5bb
---
## Steps
1. **Setup:** the env var `MORBIUS_DATA_DIR=/tmp/morbius-test` is set
2. **Action:** the server boots and a user creates a project via `POST /api/projects/create`
3. **Assert:** `data/projects.json` and the project's `tests/` / `bugs/` / `runs/` subdirs are written under `/tmp/morbius-test/`, not `<cwd>/data/`

## Expected Result
Given the env var `MORBIUS_DATA_DIR=/tmp/morbius-test` is set When the server boots and a user creates a project via `POST /api/projects/create` Then `data/projects.json` and the project's `tests/` / `bugs/` / `runs/` subdirs are written under `/tmp/morbius-test/`, not `<cwd>/data/`

