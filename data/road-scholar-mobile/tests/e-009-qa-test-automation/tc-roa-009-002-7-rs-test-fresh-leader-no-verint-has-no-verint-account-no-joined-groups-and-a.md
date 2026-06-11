---
id: TC-ROA-009-002-7
title: 'Rs-test-fresh-leader-no-verint has no Verint account, no joined groups, and a…'
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-009-002
  - e-009
created: '2026-06-05'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-002
  ac_index: 6
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-002-p0-test-accounts.md
  source_checksum: 76f0a9ed20eb0f26
---
## Steps
1. **Setup:** the nightly regen cron runs at 01:00
2. **Action:** 01:30 arrives
3. **Assert:** `rs-test-fresh-leader-no-verint` has no Verint account, no joined groups, and a clean Salesforce baseline

## Expected Result
**TC-009-002-007** Given the nightly regen cron runs at 01:00, when 01:30 arrives, then `rs-test-fresh-leader-no-verint` has no Verint account, no joined groups, and a clean Salesforce baseline

