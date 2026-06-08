---
id: TC-ROA-010-003-3
title: The user enters it on screen 1
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
  ac_index: 2
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-010-authentication-enhancements/S-010-003-native-create-account.md
  source_checksum: 282ba634856720da
---
## Steps
1. **Setup:** an email already registered
2. **Action:** the user enters it on screen 1
3. **Assert:** a clear "already in use" message + sign-in link appears (no account-enumeration concern since user is explicitly trying to register the email)

## Expected Result
**TC-010-003-002** Given an email already registered, when the user enters it on screen 1, then a clear "already in use" message + sign-in link appears (no account-enumeration concern since user is explicitly trying to register the email)

