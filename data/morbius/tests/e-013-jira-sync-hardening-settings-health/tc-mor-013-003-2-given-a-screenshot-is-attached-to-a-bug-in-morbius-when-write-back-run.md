---
id: TC-MOR-013-003-2
title: Given a screenshot is attached to a bug in Morbius When write-back run
category: e-013-jira-sync-hardening-settings-health
scenario: Detour
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
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-013-jira-sync-hardening/S-013-003-jira-writeback.md
  source_checksum: 562a1dd1c4b83d1b
---
## Steps
1. **Setup:** a screenshot is attached to a bug in Morbius
2. **Action:** write-back runs
3. **Assert:** the screenshot is uploaded as an attachment to the Jira issue (once per screenshot, deduped by hash)

## Expected Result
Given a screenshot is attached to a bug in Morbius When write-back runs Then the screenshot is uploaded as an attachment to the Jira issue (once per screenshot, deduped by hash)

