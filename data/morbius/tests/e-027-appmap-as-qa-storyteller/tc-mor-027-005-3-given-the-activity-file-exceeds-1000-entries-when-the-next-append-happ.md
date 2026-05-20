---
id: TC-MOR-027-005-3
title: Given the activity file exceeds 1000 entries When the next append happ
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
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-027-appmap-storyteller/S-027-005-agent-activity-log.md
  source_checksum: fa61376b85258e64
---
## Steps
1. **Setup:** the activity file exceeds 1000 entries
2. **Action:** the next append happens
3. **Assert:** entries older than the latest 1000 are moved to `agent-activity-archive.json`

## Expected Result
Given the activity file exceeds 1000 entries When the next append happens Then entries older than the latest 1000 are moved to `agent-activity-archive.json`

