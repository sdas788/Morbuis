---
id: TC-MOR-003-004-2
title: Given a flow in the sequence fails When it is a non-destructive flow T
category: e-003-test-execution-maestro-integration
scenario: Detour
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-003-004
  - e-003
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-003-004
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-003-test-execution-maestro/S-003-004-suite-runner.md
  source_checksum: 49e9f02ae3a2a05c
---
## Steps
1. **Setup:** a flow in the sequence fails
2. **Action:** it is a non-destructive flow
3. **Assert:** the suite continues with the next flow (not aborted)

## Expected Result
Given a flow in the sequence fails When it is a non-destructive flow Then the suite continues with the next flow (not aborted)

