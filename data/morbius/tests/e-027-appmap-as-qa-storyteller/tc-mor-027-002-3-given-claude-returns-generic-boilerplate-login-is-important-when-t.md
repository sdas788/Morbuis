---
id: TC-MOR-027-002-3
title: Given Claude returns generic boilerplate ("login is important") When t
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
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-027-appmap-storyteller/S-027-002-generation-pipeline.md
  source_checksum: d75042797692d9ce
---
## Steps
1. **Setup:** Claude returns generic boilerplate ("login is important")
2. **Action:** the lint check fires
3. **Assert:** generation retries once with a stricter prompt; if still generic, persists with `qualityFlag: 'generic'` so the UI can flag it

## Expected Result
Given Claude returns generic boilerplate ("login is important") When the lint check fires Then generation retries once with a stricter prompt; if still generic, persists with `qualityFlag: 'generic'` so the UI can flag it

