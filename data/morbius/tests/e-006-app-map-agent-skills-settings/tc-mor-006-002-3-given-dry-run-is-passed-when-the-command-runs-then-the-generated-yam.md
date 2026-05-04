---
id: TC-MOR-006-002-3
title: Given --dry-run is passed When the command runs Then the generated YAM
category: e-006-app-map-agent-skills-settings
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-006-002
  - e-006
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-006-002
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-006-appmap-agent-skills/S-006-002-flow-generation.md
  source_checksum: 7bda1741115a5924
---
## Steps
1. **Setup:** `--dry-run` is passed
2. **Action:** the command runs
3. **Assert:** the generated YAML is printed to stdout without writing any files

## Expected Result
Given `--dry-run` is passed When the command runs Then the generated YAML is printed to stdout without writing any files

