---
id: TC-MOR-016-003-2
title: Given a regeneration is enqueued When it runs Then the new impact.md o
category: e-016-bug-impact-ai-ticket-repro
scenario: Detour
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-016-003
  - e-016
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-016-003
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-016-bug-impact-ai/S-016-003-jira-webhook-regen.md
  source_checksum: 0583eb8334aabac3
---
## Steps
1. **Setup:** a regeneration is enqueued
2. **Action:** it runs
3. **Assert:** the new impact.md overwrites the previous one and the bug's changelog records "impact-regenerated: status-change"

## Expected Result
Given a regeneration is enqueued When it runs Then the new impact.md overwrites the previous one and the bug's changelog records "impact-regenerated: status-change"

