---
id: TC-ROA-009-003-4
title: Control transfers directly to the native Welcome screen — verifies the entire…
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-009-003
  - e-009
created: '2026-06-05'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-003
  ac_index: 3
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-003-implement-tf-001.md
  source_checksum: da688c2d147fcf30
---
## Steps
1. **Setup:** Journey A submits valid credentials on the native Login screen
2. **Action:** the Salesforce native login API returns a session token
3. **Assert:** control transfers directly to the native Welcome screen — verifies the entire flow stays native end-to-end with **no SSO web view appearing at any point** (this AC fails if the in-app browser opens, if a Salesforce-branded web form renders, or if an OAuth redirect chain triggers)

## Expected Result
**TC-009-003-004** Given Journey A submits valid credentials on the native Login screen, when the Salesforce native login API returns a session token, then control transfers directly to the native Welcome screen — verifies the entire flow stays native end-to-end with **no SSO web view appearing at any point** (this AC fails if the in-app browser opens, if a Salesforce-branded web form renders, or if an OAuth redirect chain triggers)

