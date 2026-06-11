---
id: TC-ROA-010-004-2
title: The session token is stored and the participant navigates to Home (or Welcome…
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
  ac_index: 1
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-010-authentication-enhancements/S-010-004-native-login.md
  source_checksum: 1e1322f06ac78c30
---
## Steps
1. **Setup:** a valid email + password submitted
2. **Action:** the Salesforce native login API call succeeds
3. **Assert:** the session token is stored and the participant navigates to Home (or Welcome on first login)

## Expected Result
**TC-010-004-002** Given a valid email + password submitted, when the Salesforce native login API call succeeds, then the session token is stored and the participant navigates to Home (or Welcome on first login)

