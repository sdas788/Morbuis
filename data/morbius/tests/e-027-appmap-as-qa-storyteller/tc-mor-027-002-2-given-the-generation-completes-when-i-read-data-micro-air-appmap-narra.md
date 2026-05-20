---
id: TC-MOR-027-002-2
title: Given the generation completes When I read data/micro-air/appmap-narra
category: e-027-appmap-as-qa-storyteller
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-027-002
  - e-027
created: '2026-05-04'
updated: '2026-05-04'
pmagent_source:
  slug: morbius
  story_id: S-027-002
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-027-appmap-storyteller/S-027-002-generation-pipeline.md
  source_checksum: 169dda2867c17852
---
## Steps
1. **Setup:** the generation completes
2. **Action:** I read `data/micro-air/appmap-narrative.md`
3. **Assert:** frontmatter has `flowsCovered === /api/maestro-tests totalFlows`, `testCasesTotal === loadAllTestCases().length`, `coveragePct === Math.round(flowsCovered / testCasesTotal * 1000) / 10`

## Expected Result
Given the generation completes When I read `data/micro-air/appmap-narrative.md` Then frontmatter has `flowsCovered === /api/maestro-tests totalFlows`, `testCasesTotal === loadAllTestCases().length`, `coveragePct === Math.round(flowsCovered / testCasesTotal * 1000) / 10`

