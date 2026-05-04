---
id: TC-MOR-025-002-3
title: Given the server starts in any mode When it logs its boot banner Then
category: e-025-morbius-v2-0-cloud-deploy-web-only-hosted
scenario: Detour
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
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-025-cloud-deploy/S-025-002-persistent-storage-data-path.md
  source_checksum: 6cf7ac53210a4888
---
## Steps
1. **Setup:** the server starts in any mode
2. **Action:** it logs its boot banner
3. **Assert:** a single line confirms the resolved data dir, e.g. `data dir: /data` — so the operator can verify the volume is mounted correctly

## Expected Result
Given the server starts in any mode When it logs its boot banner Then a single line confirms the resolved data dir, e.g. `data dir: /data` — so the operator can verify the volume is mounted correctly

