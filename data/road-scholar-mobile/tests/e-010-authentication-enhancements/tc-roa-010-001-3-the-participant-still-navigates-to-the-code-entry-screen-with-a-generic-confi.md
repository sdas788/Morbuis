---
id: TC-ROA-010-001-3
title: The participant still navigates to the code entry screen with a generic confi…
category: e-010-authentication-enhancements
scenario: Detour
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
  ac_index: 2
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-010-authentication-enhancements/S-010-001-native-reset-password.md
  source_checksum: e10d47dbb95a2a92
---
## Steps
1. **Setup:** an unregistered email submitted
2. **Action:** the API responds
3. **Assert:** the participant still navigates to the code entry screen with a generic confirmation message (no enumeration leak)

## Expected Result
**TC-010-001-003** Given an unregistered email submitted, when the API responds, then the participant still navigates to the code entry screen with a generic confirmation message (no enumeration leak)

