---
id: TC-MOR-017-006-3
title: Given the update completes When the next run of the flow happens Then
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
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-017-self-healing-selectors/S-017-006-yaml-update.md
  source_checksum: 110d1f711998334d
---
## Steps
1. **Setup:** the update completes
2. **Action:** the next run of the flow happens
3. **Assert:** it uses the new selector and (if successful) the healing cycle is considered closed — logged in the flow's changelog with reference to the proposal ID

## Expected Result
Given the update completes When the next run of the flow happens Then it uses the new selector and (if successful) the healing cycle is considered closed — logged in the flow's changelog with reference to the proposal ID

