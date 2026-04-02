---
id: TC-2.04
title: 'Edge: Offline login blocked - Edge Case'
category: login
scenario: Edge Case
status: pass
priority: P2
platforms:
  - ios
  - android
tags:
  - edge-case
created: '2026-03-26'
updated: '2026-03-26'
maestro_flow_android: >-
  /Users/sdas/Micro-Air/micro-air-testing/Andriod
  test/user_management/login_after_create_account_happy_flow.yaml
maestro_flow_ios: >-
  /Users/sdas/Micro-Air/micro-air-testing/IOS
  app/user_management/login_after_create_account_happy_flow.yaml
maestro_flow: >-
  /Users/sdas/Micro-Air/micro-air-testing/Andriod
  test/user_management/login_after_create_account_happy_flow.yaml
has_automation: true
---
## Steps
Edge: Offline login blocked

## Expected Result
Airplane mode → attempt login → clear offline error shown; no crash.

## Device Results
| Device | Status | Run | Timestamp |
|--------|--------|-----|----------|
| iphone | pass |  |  |
| android-tab | pass |  |  |

