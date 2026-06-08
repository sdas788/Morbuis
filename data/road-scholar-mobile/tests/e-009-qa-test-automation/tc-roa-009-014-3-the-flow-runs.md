---
id: TC-ROA-009-014-3
title: The flow runs
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P4
platforms:
  - android
  - ios
tags:
  - s-009-014
  - e-009
created: '2026-06-05'
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-014
  ac_index: 2
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-014-ios-airplane-version-url.md
  source_checksum: 0fc5d9bb705bf83c
---
## Steps
1. **Setup:** a real iOS device (no `simctl`)
2. **Action:** the flow runs
3. **Assert:** it blocks at a manual-step assertion with a clear "Tester: enable airplane mode on the device now, then tap continue" prompt — does not silently skip

## Expected Result
**TC-009-014-003** Given a real iOS device (no `simctl`), when the flow runs, then it blocks at a manual-step assertion with a clear "Tester: enable airplane mode on the device now, then tap continue" prompt — does not silently skip

