---
id: TC-MOR-013-001-3
title: Given a Jira API call fails transiently When the sync retries Then the
category: e-013-jira-sync-hardening-settings-health
scenario: Detour
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-013-001
  - e-013
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-013-001
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-013-jira-sync-hardening/S-013-001-audit-fix-sync-failure-modes.md
  source_checksum: 798a649a5c7df92a
---
## Steps
1. **Setup:** a Jira API call fails transiently
2. **Action:** the sync retries
3. **Assert:** the retry uses exponential backoff and does not mask persistent failures as transient (escalates after 3 attempts)

## Expected Result
Given a Jira API call fails transiently When the sync retries Then the retry uses exponential backoff and does not mask persistent failures as transient (escalates after 3 attempts)

