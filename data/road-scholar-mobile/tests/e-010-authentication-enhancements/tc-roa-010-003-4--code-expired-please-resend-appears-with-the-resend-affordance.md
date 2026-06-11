---
id: TC-ROA-010-003-4
title: '"Code expired, please resend" appears with the Resend affordance'
category: e-010-authentication-enhancements
scenario: Negative
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
  ac_index: 3
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-010-authentication-enhancements/S-010-003-native-create-account.md
  source_checksum: 48f615f9cf3f79ea
---
## Steps
1. **Setup:** a code older than 15 minutes
2. **Action:** entered on screen 2
3. **Assert:** "Code expired, please resend" appears with the Resend affordance

## Expected Result
**TC-010-003-003** Given a code older than 15 minutes, when entered on screen 2, then "Code expired, please resend" appears with the Resend affordance

