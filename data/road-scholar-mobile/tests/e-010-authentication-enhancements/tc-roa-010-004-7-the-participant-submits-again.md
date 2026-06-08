---
id: TC-ROA-010-004-7
title: The participant submits again
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
  ac_index: 6
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-010-authentication-enhancements/S-010-004-native-login.md
  source_checksum: e100c91cea534ae8
---
## Steps
1. **Setup:** the account is rate-limited after multiple failed attempts
2. **Action:** the participant submits again
3. **Assert:** a clear "Too many sign-in attempts" message appears with no submit affordance until the cooldown elapses

## Expected Result
**TC-010-004-006** Given the account is rate-limited after multiple failed attempts, when the participant submits again, then a clear "Too many sign-in attempts" message appears with no submit affordance until the cooldown elapses

