---
id: TC-ROA-010-001-15
title: The failure is detected
category: e-010-authentication-enhancements
scenario: Negative
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
  ac_index: 14
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-010-authentication-enhancements/S-010-001-native-reset-password.md
  source_checksum: 9474cbd7d64acf2e
---
## Steps
1. **Setup:** network failure on Resend tap
2. **Action:** the failure is detected
3. **Assert:** an inline error appears, the code field input is preserved, and the participant can retry ### Accessibility (cross-cutting)

## Expected Result
**TC-010-001-014** Given network failure on Resend tap, when the failure is detected, then an inline error appears, the code field input is preserved, and the participant can retry ### Accessibility (cross-cutting)

