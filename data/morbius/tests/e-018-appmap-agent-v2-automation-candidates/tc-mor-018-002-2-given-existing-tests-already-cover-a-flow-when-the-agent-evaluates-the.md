---
id: TC-MOR-018-002-2
title: Given existing tests already cover a flow When the agent evaluates The
category: e-018-appmap-agent-v2-automation-candidates
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-018-002
  - e-018
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-018-002
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-018-appmap-agent-v2/S-018-002-priority-rationale-generation.md
  source_checksum: 7325e75cb094de57
---
## Steps
1. **Setup:** existing tests already cover a flow
2. **Action:** the agent evaluates
3. **Assert:** it correctly marks `coverageStatus: covered` and deprioritizes it (P3 or omit)

## Expected Result
Given existing tests already cover a flow When the agent evaluates Then it correctly marks `coverageStatus: covered` and deprioritizes it (P3 or omit)

