---
id: TC-MOR-022-001-2
title: Given any of the gate criteria later becomes true When a future sessio
category: e-022-maestro-as-sdk-agent-decision-gate
scenario: Detour
status: not-run
priority: P4
platforms:
  - android
  - ios
tags:
  - s-022-001
  - e-022
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-022-001
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-022-maestro-sdk-agent-gate/S-022-001-decision-doc.md
  source_checksum: 8350232b2593f1ab
---
## Steps
1. **Setup:** any of the gate criteria later becomes true
2. **Action:** a future session revisits this story
3. **Assert:** they have enough context to either (a) keep the gate closed with updated reasoning, or (b) open the gate and spawn a new build epic

## Expected Result
Given any of the gate criteria later becomes true When a future session revisits this story Then they have enough context to either (a) keep the gate closed with updated reasoning, or (b) open the gate and spawn a new build epic

