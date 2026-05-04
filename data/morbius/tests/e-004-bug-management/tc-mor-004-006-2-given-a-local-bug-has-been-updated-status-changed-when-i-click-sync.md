---
id: TC-MOR-004-006-2
title: Given a local bug has been updated (status changed) When I click "Sync
category: e-004-bug-management
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-004-006
  - e-004
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-004-006
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-004-bug-management/S-004-006-jira-sync.md
  source_checksum: 54163b2ab56e6eff
---
## Steps
1. **Setup:** a local bug has been updated (status changed)
2. **Action:** I click "Sync" on that bug
3. **Assert:** the Jira issue status is updated to match (bidirectional)

## Expected Result
Given a local bug has been updated (status changed) When I click "Sync" on that bug Then the Jira issue status is updated to match (bidirectional)

