---
id: TC-MOR-013-004-2
title: Given items exist in the replay queue When the next sync cycle runs Th
category: e-013-jira-sync-hardening-settings-health
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-013-004
  - e-013
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-013-004
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-013-jira-sync-hardening/S-013-004-replay-queue.md
  source_checksum: f811db931c0bba2e
---
## Steps
1. **Setup:** items exist in the replay queue
2. **Action:** the next sync cycle runs
3. **Assert:** queued items are replayed first, with exponential backoff; on success they're removed from the queue

## Expected Result
Given items exist in the replay queue When the next sync cycle runs Then queued items are replayed first, with exponential backoff; on success they're removed from the queue

