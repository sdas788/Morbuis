---
id: TC-ROA-010-004-15
title: Telemetry is captured
category: e-010-authentication-enhancements
scenario: Negative
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
  ac_index: 14
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-010-authentication-enhancements/S-010-004-native-login.md
  source_checksum: 5f02684c962f0d15
---
## Steps
1. **Setup:** each touchpoint fires
2. **Action:** telemetry is captured
3. **Assert:** `login_attempted`, `login_succeeded`, `login_failed` (with error code) events are sent at the correct moments per the analytics convention ### Existing-user transparent migration (per W1 client confirmation)

## Expected Result
**TC-010-004-014** Given each touchpoint fires, when telemetry is captured, then `login_attempted`, `login_succeeded`, `login_failed` (with error code) events are sent at the correct moments per the analytics convention ### Existing-user transparent migration (per W1 client confirmation)

