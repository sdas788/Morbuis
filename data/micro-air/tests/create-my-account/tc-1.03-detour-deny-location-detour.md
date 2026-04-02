---
id: TC-1.03
title: 'Detour: Deny Location - Detour'
category: create-my-account
scenario: Detour
status: pass
priority: P2
platforms:
  - ios
  - android
tags:
  - detour
created: '2026-03-26'
updated: '2026-03-26'
maestro_flow_android: >-
  /Users/sdas/Micro-Air/micro-air-testing/Andriod
  test/user_management/create_account_mfa_success_flow.yaml
maestro_flow_ios: >-
  /Users/sdas/Micro-Air/micro-air-testing/IOS
  app/user_management/create_account_mfa_success_flow.yaml
maestro_flow: >-
  /Users/sdas/Micro-Air/micro-air-testing/Andriod
  test/user_management/create_account_mfa_success_flow.yaml
has_automation: true
---
## Steps
Detour: Deny Location

## Expected Result
During onboarding, deny location → onboarding still completes → Dashboard loads (no blocking loop).

## Device Results
| Device | Status | Run | Timestamp |
|--------|--------|-----|----------|
| iphone | pass |  |  |
| android-tab | pass |  |  |

