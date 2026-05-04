---
id: TC-MOR-018-003-2
title: Given generation completes When I return to the candidate list Then th
category: e-018-appmap-agent-v2-automation-candidates
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-018-003
  - e-018
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-018-003
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-018-appmap-agent-v2/S-018-003-one-click-yaml-generation.md
  source_checksum: a2b5e375e13453f1
---
## Steps
1. **Setup:** generation completes
2. **Action:** I return to the candidate list
3. **Assert:** the candidate's coverage status updates to "partial" (generated but not run) and a "Run Now" button appears

## Expected Result
Given generation completes When I return to the candidate list Then the candidate's coverage status updates to "partial" (generated but not run) and a "Run Now" button appears

