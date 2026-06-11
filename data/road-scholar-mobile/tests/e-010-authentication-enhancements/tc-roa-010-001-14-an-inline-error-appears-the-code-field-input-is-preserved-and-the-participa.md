---
id: TC-ROA-010-001-14
title: 'An inline error appears, the code field input is preserved, and the participa…'
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
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-010-001
  ac_index: 13
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-010-authentication-enhancements/S-010-001-native-reset-password.md
  source_checksum: 3eef5f6aa59620ee
---
## Steps
1. **Setup:** network failure on Resend tap
2. **Action:** the failure is detected
3. **Assert:** an inline error appears, the code field input is preserved, and the participant can retry

## Expected Result
**TC-010-001-014** Given network failure on Resend tap, when the failure is detected, then an inline error appears, the code field input is preserved, and the participant can retry

