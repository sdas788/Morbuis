---
id: TC-MOR-013-003-3
title: Given a write-back fails due to a Jira API error When the failure occu
category: e-013-jira-sync-hardening-settings-health
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-013-003
  - e-013
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-013-003
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-013-jira-sync-hardening/S-013-003-jira-writeback.md
  source_checksum: eec11858dcc0f9c2
---
## Steps
1. **Setup:** a write-back fails due to a Jira API error
2. **Action:** the failure occurs
3. **Assert:** the edit is queued in the replay queue (see S-013-004) and the health panel shows the pending count ---

## Expected Result
Given a write-back fails due to a Jira API error When the failure occurs Then the edit is queued in the replay queue (see S-013-004) and the health panel shows the pending count ---

