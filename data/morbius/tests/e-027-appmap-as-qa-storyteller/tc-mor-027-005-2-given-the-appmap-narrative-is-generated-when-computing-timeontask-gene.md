---
id: TC-MOR-027-005-2
title: Given the AppMap narrative is generated When computing timeOnTask.gene
category: e-027-appmap-as-qa-storyteller
scenario: Detour
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-027-005
  - e-027
created: '2026-05-04'
updated: '2026-05-04'
pmagent_source:
  slug: morbius
  story_id: S-027-005
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-027-appmap-storyteller/S-027-005-agent-activity-log.md
  source_checksum: 89bc1295304c0082
---
## Steps
1. **Setup:** the AppMap narrative is generated
2. **Action:** computing `timeOnTask.generationMs`
3. **Assert:** the helper sums durations from `agent-activity.json` (filtered to kind `appmap-narrative`)

## Expected Result
Given the AppMap narrative is generated When computing `timeOnTask.generationMs` Then the helper sums durations from `agent-activity.json` (filtered to kind `appmap-narrative`)

