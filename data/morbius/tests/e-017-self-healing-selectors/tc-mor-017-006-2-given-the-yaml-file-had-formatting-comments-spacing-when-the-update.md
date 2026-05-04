---
id: TC-MOR-017-006-2
title: 'Given the YAML file had formatting (comments, spacing) When the update'
category: e-017-self-healing-selectors
scenario: Detour
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-017-006
  - e-017
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-017-006
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-017-self-healing-selectors/S-017-006-yaml-update.md
  source_checksum: a43ac82e7a806fb0
---
## Steps
1. **Setup:** the YAML file had formatting (comments, spacing)
2. **Action:** the update runs
3. **Assert:** surrounding formatting is preserved (no YAML reflow)

## Expected Result
Given the YAML file had formatting (comments, spacing) When the update runs Then surrounding formatting is preserved (no YAML reflow)

