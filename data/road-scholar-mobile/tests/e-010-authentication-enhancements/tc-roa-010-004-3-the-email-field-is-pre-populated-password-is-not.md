---
id: TC-ROA-010-004-3
title: The email field is pre-populated (password is NOT)
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
  ac_index: 2
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-010-authentication-enhancements/S-010-004-native-login.md
  source_checksum: e3fdc143134a9c91
---
## Steps
1. **Setup:** a participant has Remember Me enabled
2. **Action:** they return to the app after closing
3. **Assert:** the email field is pre-populated (password is NOT)

## Expected Result
**TC-010-004-003** Given a participant has Remember Me enabled, when they return to the app after closing, then the email field is pre-populated (password is NOT)

