---
id: TC-ROA-009-014-2
title: The sim's network is disabled within 5 seconds and the app's NetInfo listener…
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
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-014
  ac_index: 1
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-014-ios-airplane-version-url.md
  source_checksum: df65ccc193bece8f
---
## Steps
1. **Setup:** an iOS sim with `xcrun simctl` available
2. **Action:** Maestro invokes the same shared flow
3. **Assert:** the sim's network is disabled within 5 seconds and the app's NetInfo listener fires

## Expected Result
**TC-009-014-002** Given an iOS sim with `xcrun simctl` available, when Maestro invokes the same shared flow, then the sim's network is disabled within 5 seconds and the app's NetInfo listener fires

