---
id: TC-ROA-010-003-6
title: They foreground 3 minutes later
category: e-010-authentication-enhancements
scenario: Detour
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-010-003
  - e-010
created: '2026-06-05'
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-010-003
  ac_index: 5
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-010-authentication-enhancements/S-010-003-native-create-account.md
  source_checksum: 5e145786c0e58660
---
## Steps
1. **Setup:** the user backgrounds the app mid-signup
2. **Action:** they foreground 3 minutes later
3. **Assert:** the form state on the current screen is preserved (5-minute window)

## Expected Result
**TC-010-003-005** Given the user backgrounds the app mid-signup, when they foreground 3 minutes later, then the form state on the current screen is preserved (5-minute window)

