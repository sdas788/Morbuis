---
id: TC-MOR-002-004-2
title: Given a status update is saved When I open the test case detail Then t
category: e-002-test-case-management
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-002-004
  - e-002
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-002-004
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-002-test-case-management/S-002-004-inline-status-changelog.md
  source_checksum: 3d4235fd6ea7fc5a
---
## Steps
1. **Setup:** a status update is saved
2. **Action:** I open the test case detail
3. **Assert:** the changelog table shows: timestamp, field ("status"), old value, new value, actor

## Expected Result
Given a status update is saved When I open the test case detail Then the changelog table shows: timestamp, field ("status"), old value, new value, actor

