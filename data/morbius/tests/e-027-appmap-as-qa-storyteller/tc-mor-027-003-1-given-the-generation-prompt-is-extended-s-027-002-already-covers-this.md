---
id: TC-MOR-027-003-1
title: Given the generation prompt is extended (S-027-002 already covers this
category: e-027-appmap-as-qa-storyteller
scenario: Happy Path
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-027-003
  - e-027
created: '2026-05-04'
updated: '2026-05-04'
pmagent_source:
  slug: morbius
  story_id: S-027-003
  ac_index: 0
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-027-appmap-storyteller/S-027-003-per-flow-rationale.md
  source_checksum: ceaa147a921610a2
---
## Steps
1. **Setup:** the generation prompt is extended (S-027-002 already covers this story's prompt edits)
2. **Action:** Claude returns the structured response
3. **Assert:** `perFlow[]` has one entry per flow currently visible on the Maestro tab, each with `{flowId, whyPicked, lastRunsSummary, agentTimeMs}`

## Expected Result
Given the generation prompt is extended (S-027-002 already covers this story's prompt edits) When Claude returns the structured response Then `perFlow[]` has one entry per flow currently visible on the Maestro tab, each with `{flowId, whyPicked, lastRunsSummary, agentTimeMs}`

