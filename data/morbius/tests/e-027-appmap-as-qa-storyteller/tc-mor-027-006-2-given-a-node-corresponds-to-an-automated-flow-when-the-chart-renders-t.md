---
id: TC-MOR-027-006-2
title: Given a node corresponds to an automated flow When the chart renders T
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
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-027-appmap-storyteller/S-027-006-mermaid-visual-upgrade.md
  source_checksum: 22fd0e3817440d92
---
## Steps
1. **Setup:** a node corresponds to an automated flow
2. **Action:** the chart renders
3. **Assert:** the node has a 3px-wide left border colored by the flow's run status (green `#45E0A8` for pass, amber `#F5A623` for partial/flaky, gray `#333` for none, dashed amber for in-progress)

## Expected Result
Given a node corresponds to an automated flow When the chart renders Then the node has a 3px-wide left border colored by the flow's run status (green `#45E0A8` for pass, amber `#F5A623` for partial/flaky, gray `#333` for none, dashed amber for in-progress)

