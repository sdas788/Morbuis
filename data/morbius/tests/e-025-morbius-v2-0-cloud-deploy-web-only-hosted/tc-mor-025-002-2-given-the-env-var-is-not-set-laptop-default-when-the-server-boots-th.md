---
id: TC-MOR-025-002-2
title: Given the env var is NOT set (laptop default) When the server boots Th
category: e-025-morbius-v2-0-cloud-deploy-web-only-hosted
scenario: Edge Case
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
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-025-cloud-deploy/S-025-002-persistent-storage-data-path.md
  source_checksum: fe08a362c507d70e
---
## Steps
1. **Setup:** the env var is NOT set (laptop default)
2. **Action:** the server boots
3. **Assert:** the data path resolves to `<cwd>/data/` exactly as it does today (no behavior change for existing local users)

## Expected Result
Given the env var is NOT set (laptop default) When the server boots Then the data path resolves to `<cwd>/data/` exactly as it does today (no behavior change for existing local users)

