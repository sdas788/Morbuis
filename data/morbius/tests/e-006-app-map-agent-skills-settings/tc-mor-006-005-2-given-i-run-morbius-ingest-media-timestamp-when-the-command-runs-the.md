---
id: TC-MOR-006-005-2
title: Given I run morbius ingest-media --timestamp When the command runs The
category: e-006-app-map-agent-skills-settings
scenario: Detour
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-006-005
  - e-006
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-006-005
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-006-appmap-agent-skills/S-006-005-run-media-viewer.md
  source_checksum: b4dbfa836dca4e6b
---
## Steps
1. **Setup:** I run `morbius ingest-media --timestamp`
2. **Action:** the command runs
3. **Assert:** the latest Maestro run's media is copied from the Maestro output directory to the project `mediaPath`

## Expected Result
Given I run `morbius ingest-media --timestamp` When the command runs Then the latest Maestro run's media is copied from the Maestro output directory to the project `mediaPath`

