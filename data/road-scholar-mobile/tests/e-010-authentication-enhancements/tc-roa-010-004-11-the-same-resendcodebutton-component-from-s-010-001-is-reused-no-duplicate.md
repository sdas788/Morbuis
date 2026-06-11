---
id: TC-ROA-010-004-11
title: The same <ResendCodeButton> component from S-010-001 is reused (no duplicate…
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
  ac_index: 10
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-010-authentication-enhancements/S-010-004-native-login.md
  source_checksum: 6449a150a3b74adb
---
## Steps
1. **Setup:** Salesforce requires email verification on first login
2. **Action:** the verification screen renders
3. **Assert:** the same `<ResendCodeButton>` component from S-010-001 is reused (no duplicate implementation)

## Expected Result
**TC-010-004-011** Given Salesforce requires email verification on first login, when the verification screen renders, then the same `<ResendCodeButton>` component from S-010-001 is reused (no duplicate implementation)

