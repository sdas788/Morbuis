---
id: TC-ROA-010-004-15
title: Auth succeeds end-to-end and they land on Home with their existing profile +…
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
  ac_index: 14
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-010-authentication-enhancements/S-010-004-native-login.md
  source_checksum: 99a56ca9b1fb58d3
---
## Steps
1. **Setup:** an existing Road Scholar participant who previously signed in via the SSO web view (R-001 shipped behavior with a known email + password)
2. **Action:** they sign in via the new native Login screen using those same credentials
3. **Assert:** auth succeeds end-to-end and they land on Home with their existing profile + groups intact. **No password reset, no email verification, no migration step.** This is the smoke test that confirms the same-Salesforce-domain assumption (Open Question 2 in E-010, answered 2026-06-05) is correctly wired in production.

## Expected Result
**TC-010-004-015** Given an existing Road Scholar participant who previously signed in via the SSO web view (R-001 shipped behavior with a known email + password), when they sign in via the new native Login screen using those same credentials, then auth succeeds end-to-end and they land on Home with their existing profile + groups intact. **No password reset, no email verification, no migration step.** This is the smoke test that confirms the same-Salesforce-domain assumption (Open Question 2 in E-010, answered 2026-06-05) is correctly wired in production.

