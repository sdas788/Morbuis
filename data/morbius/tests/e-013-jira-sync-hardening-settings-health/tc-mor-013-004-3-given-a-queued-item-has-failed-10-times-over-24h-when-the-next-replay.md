---
id: TC-MOR-013-004-3
title: Given a queued item has failed >10 times over 24h When the next replay
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
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-013-jira-sync-hardening/S-013-004-replay-queue.md
  source_checksum: 2af9e412293d07a7
---
## Steps
1. **Setup:** a queued item has failed >10 times over 24h
2. **Action:** the next replay runs
3. **Assert:** the item is marked as "stuck," surfaced in the health panel, and requires manual action (retry / discard) ---

## Expected Result
Given a queued item has failed >10 times over 24h When the next replay runs Then the item is marked as "stuck," surfaced in the health panel, and requires manual action (retry / discard) ---

