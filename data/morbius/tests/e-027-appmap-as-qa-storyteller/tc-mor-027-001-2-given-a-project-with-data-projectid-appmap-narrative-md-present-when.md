---
id: TC-MOR-027-001-2
title: 'Given a project with data/{projectId}/appmap-narrative.md present When'
category: e-027-appmap-as-qa-storyteller
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-027-001
  - e-027
created: '2026-05-04'
updated: '2026-05-04'
pmagent_source:
  slug: morbius
  story_id: S-027-001
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-027-appmap-storyteller/S-027-001-narrative-data-model.md
  source_checksum: d5dd09265af03fbe
---
## Steps
1. **Setup:** a project with `data/{projectId}/appmap-narrative.md` present
2. **Action:** the client calls `GET /api/appmap/narrative`
3. **Assert:** it returns `{ narrative: AppMapNarrative }` parsed from frontmatter + body, with all fields populated (projectId, generatedAt, flowsCovered, testCasesTotal, coveragePct, whyTheseFlows, whatTheAgentLearned, timeOnTask, perFlow[])

## Expected Result
Given a project with `data/{projectId}/appmap-narrative.md` present When the client calls `GET /api/appmap/narrative` Then it returns `{ narrative: AppMapNarrative }` parsed from frontmatter + body, with all fields populated (projectId, generatedAt, flowsCovered, testCasesTotal, coveragePct, whyTheseFlows, whatTheAgentLearned, timeOnTask, perFlow[])

