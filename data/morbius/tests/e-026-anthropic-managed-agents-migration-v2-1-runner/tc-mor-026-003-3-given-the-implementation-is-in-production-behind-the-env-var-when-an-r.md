---
id: TC-MOR-026-003-3
title: Given the implementation is in production behind the env var When an R
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
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-026-managed-agents-migration/S-026-003-implement-managed-agents-mode.md
  source_checksum: a90c9d3929036415
---
## Steps
1. **Setup:** the implementation is in production behind the env var
2. **Action:** an RF engineer runs the same test case with `mode=cli-subprocess` (default) and `mode=managed-agents` (opt-in)
3. **Assert:** both produce passing results within the same time budget (target: managed-agents within 1.2× CLI mode latency)

## Expected Result
Given the implementation is in production behind the env var When an RF engineer runs the same test case with `mode=cli-subprocess` (default) and `mode=managed-agents` (opt-in) Then both produce passing results within the same time budget (target: managed-agents within 1.2× CLI mode latency)

