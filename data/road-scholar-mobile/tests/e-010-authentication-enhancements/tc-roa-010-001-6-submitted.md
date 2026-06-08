---
id: TC-ROA-010-001-6
title: Submitted
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
  ac_index: 5
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-010-authentication-enhancements/S-010-001-native-reset-password.md
  source_checksum: c3bf80ae5f644b25
---
## Steps
1. **Setup:** a code older than 15 minutes is entered
2. **Action:** submitted
3. **Assert:** a clear "Code expired, please resend" error appears with a tappable Resend affordance

## Expected Result
**TC-010-001-005** Given a code older than 15 minutes is entered, when submitted, then a clear "Code expired, please resend" error appears with a tappable Resend affordance

