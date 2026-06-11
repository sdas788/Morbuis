---
id: TC-ROA-010-003-7
title: 'They''re returned to screen 1 with a "session timed out" message (security: do…'
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
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-010-003
  ac_index: 6
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-010-authentication-enhancements/S-010-003-native-create-account.md
  source_checksum: e7eda42eb4c784af
---
## Steps
1. **Setup:** the user backgrounds for >5 minutes
2. **Action:** they foreground
3. **Assert:** they're returned to screen 1 with a "session timed out" message (security: don't preserve email + code indefinitely in memory)

## Expected Result
**TC-010-003-006** Given the user backgrounds for >5 minutes, when they foreground, then they're returned to screen 1 with a "session timed out" message (security: don't preserve email + code indefinitely in memory)

