---
id: TC-ROA-010-004-8
title: A clear "We're having trouble reaching the server" message appears with a Ret…
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
  ac_index: 7
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-010-authentication-enhancements/S-010-004-native-login.md
  source_checksum: 70ce1a742eebd44d
---
## Steps
1. **Setup:** Salesforce is unreachable (5xx or timeout)
2. **Action:** the API call fails
3. **Assert:** a clear "We're having trouble reaching the server" message appears with a Retry affordance that preserves the entered email

## Expected Result
**TC-010-004-008** Given Salesforce is unreachable (5xx or timeout), when the API call fails, then a clear "We're having trouble reaching the server" message appears with a Retry affordance that preserves the entered email

