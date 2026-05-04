---
id: TC-MOR-026-003-2
title: Given the implementation is complete When I run a test case via the da
category: e-026-anthropic-managed-agents-migration-v2-1-runner
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-026-003
  - e-026
created: '2026-04-30'
updated: '2026-04-30'
pmagent_source:
  slug: morbius
  story_id: S-026-003
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-026-managed-agents-migration/S-026-003-implement-managed-agents-mode.md
  source_checksum: bcaac0b8c7916bdb
---
## Steps
1. **Setup:** the implementation is complete
2. **Action:** I run a test case via the dashboard with `MORBIUS_AGENT_MODE=managed-agents` set
3. **Assert:** the run executes against the v2.1 architecture, screenshots persist on the volume, run history records the mode, and the result is indistinguishable from a CLI-mode run for the same test case

## Expected Result
Given the implementation is complete When I run a test case via the dashboard with `MORBIUS_AGENT_MODE=managed-agents` set Then the run executes against the v2.1 architecture, screenshots persist on the volume, run history records the mode, and the result is indistinguishable from a CLI-mode run for the same test case

