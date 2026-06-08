---
id: TC-ROA-010-004-13
title: Sign-out completes
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
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-010-004
  ac_index: 12
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-010-authentication-enhancements/S-010-004-native-login.md
  source_checksum: 79e714ef3715c470
---
## Steps
1. **Setup:** Sign Out from Settings is tapped
2. **Action:** sign-out completes
3. **Assert:** the participant is routed back to the native Login screen (not the SSO web view, which no longer exists) ### Accessibility + telemetry

## Expected Result
**TC-010-004-012** Given Sign Out from Settings is tapped, when sign-out completes, then the participant is routed back to the native Login screen (not the SSO web view, which no longer exists) ### Accessibility + telemetry

