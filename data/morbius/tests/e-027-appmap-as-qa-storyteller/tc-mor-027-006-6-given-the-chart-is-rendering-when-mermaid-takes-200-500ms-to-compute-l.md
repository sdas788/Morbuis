---
id: TC-MOR-027-006-6
title: Given the chart is rendering When Mermaid takes 200–500ms to compute l
category: e-027-appmap-as-qa-storyteller
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-027-006
  - e-027
created: '2026-05-04'
updated: '2026-05-04'
pmagent_source:
  slug: morbius
  story_id: S-027-006
  ac_index: 5
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-027-appmap-storyteller/S-027-006-mermaid-visual-upgrade.md
  source_checksum: 900274c7e05daf26
---
## Steps
1. **Setup:** the chart is rendering
2. **Action:** Mermaid takes 200–500ms to compute layout
3. **Assert:** a skeleton with 6 ghost rectangles + slow shimmer fills the space until the chart is ready

## Expected Result
Given the chart is rendering When Mermaid takes 200–500ms to compute layout Then a skeleton with 6 ghost rectangles + slow shimmer fills the space until the chart is ready

