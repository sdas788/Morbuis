---
id: TC-ROA-009-015-4
title: Connectivity returns
category: e-009-qa-test-automation
scenario: Edge Case
status: not-run
priority: P4
platforms:
  - android
  - ios
tags:
  - s-009-015
  - e-009
created: '2026-06-05'
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-015
  ac_index: 3
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-015-implement-tf-005.md
  source_checksum: 654efa98a03c16a9
---
## Steps
1. **Setup:** Journey B's extended-offline alt timing (5+ min offline before reconnect)
2. **Action:** connectivity returns
3. **Assert:** the app recovers without a relaunch — no infinite spinner (RSS-403 + RSS-404)

## Expected Result
**TC-009-015-004** Given Journey B's extended-offline alt timing (5+ min offline before reconnect), when connectivity returns, then the app recovers without a relaunch — no infinite spinner (RSS-403 + RSS-404)

