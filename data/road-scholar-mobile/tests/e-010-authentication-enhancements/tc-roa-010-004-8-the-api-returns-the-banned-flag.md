---
id: TC-ROA-010-004-8
title: The API returns the banned flag
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
  ac_index: 7
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-010-authentication-enhancements/S-010-004-native-login.md
  source_checksum: ae4f2262853fa570
---
## Steps
1. **Setup:** a banned account submits credentials
2. **Action:** the API returns the banned flag
3. **Assert:** a "Your account has been suspended" lockout banner appears with no Home redirect

## Expected Result
**TC-010-004-007** Given a banned account submits credentials, when the API returns the banned flag, then a "Your account has been suspended" lockout banner appears with no Home redirect

