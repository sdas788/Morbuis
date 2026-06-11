---
id: TC-ROA-010-004-5
title: 'An inline "Email or password didn''t match" message appears, the password fiel…'
category: e-010-authentication-enhancements
scenario: Negative
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
  ac_index: 4
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-010-authentication-enhancements/S-010-004-native-login.md
  source_checksum: c61dba3736abb7e1
---
## Steps
1. **Setup:** wrong password submitted
2. **Action:** the API returns an auth-failed error
3. **Assert:** an inline "Email or password didn't match" message appears, the password field is cleared, and the email field is preserved

## Expected Result
**TC-010-004-005** Given wrong password submitted, when the API returns an auth-failed error, then an inline "Email or password didn't match" message appears, the password field is cleared, and the email field is preserved

