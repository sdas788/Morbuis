---
id: TC-MOR-020-002-2
title: Given AppMap nodes exist that no test references When cross-referencin
category: e-020-legacy-app-coverage-scan-gated
scenario: Detour
status: not-run
priority: P4
platforms:
  - android
  - ios
tags:
  - s-020-002
  - e-020
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-020-002
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-020-legacy-app-coverage-scan/S-020-002-cross-reference.md
  source_checksum: 609b9a3092fe485a
---
## Steps
1. **Setup:** AppMap nodes exist that no test references
2. **Action:** cross-referencing runs
3. **Assert:** those nodes are flagged as `uncovered` with risk estimation (based on depth from entry, destructive-action detection, etc.) ---

## Expected Result
Given AppMap nodes exist that no test references When cross-referencing runs Then those nodes are flagged as `uncovered` with risk estimation (based on depth from entry, destructive-action detection, etc.) ---

