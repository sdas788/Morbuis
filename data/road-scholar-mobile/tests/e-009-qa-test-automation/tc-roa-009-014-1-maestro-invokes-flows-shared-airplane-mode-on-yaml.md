---
id: TC-ROA-009-014-1
title: Maestro invokes flows/shared/airplane-mode-on.yaml
category: e-009-qa-test-automation
scenario: Happy Path
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
  ac_index: 0
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-014-ios-airplane-version-url.md
  source_checksum: 9757062d8bf71354
---
## Steps
1. **Setup:** an Android emulator
2. **Action:** Maestro invokes `flows/shared/airplane-mode-on.yaml`
3. **Assert:** airplane mode is toggled on within 2 seconds and the app's NetInfo listener fires `isConnected: false`

## Expected Result
**TC-009-014-001** Given an Android emulator, when Maestro invokes `flows/shared/airplane-mode-on.yaml`, then airplane mode is toggled on within 2 seconds and the app's NetInfo listener fires `isConnected: false`

