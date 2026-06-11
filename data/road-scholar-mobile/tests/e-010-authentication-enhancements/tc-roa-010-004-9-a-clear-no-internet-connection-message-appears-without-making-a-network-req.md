---
id: TC-ROA-010-004-9
title: A clear "No internet connection" message appears without making a network req…
category: e-010-authentication-enhancements
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-010-004
  - e-010
created: '2026-06-05'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-010-004
  ac_index: 8
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-010-authentication-enhancements/S-010-004-native-login.md
  source_checksum: 85e99d988167e592
---
## Steps
1. **Setup:** the device is offline
2. **Action:** the participant taps Sign In
3. **Assert:** a clear "No internet connection" message appears without making a network request

## Expected Result
**TC-010-004-009** Given the device is offline, when the participant taps Sign In, then a clear "No internet connection" message appears without making a network request

