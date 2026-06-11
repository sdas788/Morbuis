---
id: TC-ROA-010-001-12
title: A "Too many requests" message appears and the button is hard-disabled until t…
category: e-010-authentication-enhancements
scenario: Edge Case
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
  ac_index: 11
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-010-authentication-enhancements/S-010-001-native-reset-password.md
  source_checksum: 05a4ccca3f1e4b9e
---
## Steps
1. **Setup:** the participant taps Resend 3 times within 5 minutes
2. **Action:** they tap a 4th time
3. **Assert:** a "Too many requests" message appears and the button is hard-disabled until the rate-limit window passes

## Expected Result
**TC-010-001-012** Given the participant taps Resend 3 times within 5 minutes, when they tap a 4th time, then a "Too many requests" message appears and the button is hard-disabled until the rate-limit window passes

