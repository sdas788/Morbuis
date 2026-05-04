---
id: TC-MOR-003-005-2
title: Given a test fails in the ingest When a failure screenshot exists in t
category: e-003-test-execution-maestro-integration
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-003-005
  - e-003
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-003-005
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-003-test-execution-maestro/S-003-005-run-history-ingest.md
  source_checksum: a291a6958e9a4ee4
---
## Steps
1. **Setup:** a test fails in the ingest
2. **Action:** a failure screenshot exists in the output
3. **Assert:** the screenshot is copied to `data/{project}/screenshots/` and linked in the auto-created bug ticket

## Expected Result
Given a test fails in the ingest When a failure screenshot exists in the output Then the screenshot is copied to `data/{project}/screenshots/` and linked in the auto-created bug ticket

