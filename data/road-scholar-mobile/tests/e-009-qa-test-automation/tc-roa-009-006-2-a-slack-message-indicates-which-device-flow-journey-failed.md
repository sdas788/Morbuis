---
id: TC-ROA-009-006-2
title: A Slack message indicates which device + flow + journey failed
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-009-006
  - e-009
created: '2026-06-05'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-006
  ac_index: 1
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-006-maestro-cloud-nightly.md
  source_checksum: 0111680d8e0e205e
---
## Steps
1. **Setup:** a nightly run executes against iPhone 15 + Pixel 7
2. **Action:** any flow fails on either platform
3. **Assert:** a Slack message indicates which device + flow + journey failed

## Expected Result
**TC-009-006-002** Given a nightly run executes against iPhone 15 + Pixel 7, when any flow fails on either platform, then a Slack message indicates which device + flow + journey failed

