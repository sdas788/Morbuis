---
id: TC-ROA-010-003-9
title: Retry is tapped
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
  ac_index: 8
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-010-authentication-enhancements/S-010-003-native-create-account.md
  source_checksum: 021d451a31ea44b6
---
## Steps
1. **Setup:** network failure during account creation
2. **Action:** retry is tapped
3. **Assert:** NO duplicate account is created (idempotency via client-generated request ID)

## Expected Result
**TC-010-003-008** Given network failure during account creation, when retry is tapped, then NO duplicate account is created (idempotency via client-generated request ID)

