---
id: TC-ROA-010-003-8
title: Tokens are returned
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
  ac_index: 7
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-010-authentication-enhancements/S-010-003-native-create-account.md
  source_checksum: 401ba772d35e4f2a
---
## Steps
1. **Setup:** the Salesforce creation API succeeds
2. **Action:** tokens are returned
3. **Assert:** they're stored in the same secure store as SSO login tokens (no second token storage path)

## Expected Result
**TC-010-003-007** Given the Salesforce creation API succeeds, when tokens are returned, then they're stored in the same secure store as SSO login tokens (no second token storage path)

