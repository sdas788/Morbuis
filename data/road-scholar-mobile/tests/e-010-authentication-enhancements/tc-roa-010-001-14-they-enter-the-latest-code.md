---
id: TC-ROA-010-001-14
title: They enter the latest code
category: e-010-authentication-enhancements
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-010-001
  - e-010
created: '2026-06-05'
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-010-001
  ac_index: 13
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-010-authentication-enhancements/S-010-001-native-reset-password.md
  source_checksum: e19db2cd66e02abc
---
## Steps
1. **Setup:** the participant resends a code
2. **Action:** they enter the latest code
3. **Assert:** the previous code is invalidated server-side (only the most recently sent code works)

## Expected Result
**TC-010-001-013** Given the participant resends a code, when they enter the latest code, then the previous code is invalidated server-side (only the most recently sent code works)

