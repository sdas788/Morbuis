---
id: TC-MOR-006-002-2
title: Given a field has a visibleIf dependency When flow is generated Then t
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
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-006-appmap-agent-skills/S-006-002-flow-generation.md
  source_checksum: 657e3a58682c0ce1
---
## Steps
1. **Setup:** a field has a `visibleIf` dependency
2. **Action:** flow is generated
3. **Assert:** the parent field action appears before the dependent field (topological sort)

## Expected Result
Given a field has a `visibleIf` dependency When flow is generated Then the parent field action appears before the dependent field (topological sort)

