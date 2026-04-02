---
id: TC-2.01
title: 'Happy Path: Login success - Flow'
category: login
scenario: Flow
status: pass
priority: P2
platforms:
  - ios
  - android
tags:
  - flow
created: '2026-03-26'
updated: '2026-03-26'
maestro_flow_android: >-
  /Users/sdas/Micro-Air/micro-air-testing/Andriod
  test/user_management/login_happy_flow.yaml
maestro_flow_ios: >-
  /Users/sdas/Micro-Air/micro-air-testing/IOS
  app/user_management/login_happy_flow.yaml
maestro_flow: >-
  /Users/sdas/Micro-Air/micro-air-testing/Andriod
  test/user_management/login_happy_flow.yaml
has_automation: true
---
## Steps
Happy Path: Login success

## Expected Result
Valid email + password → Log In → lands on Dashboard/Hub Home.

## Device Results
| Device | Status | Run | Timestamp |
|--------|--------|-----|----------|
| iphone | pass |  |  |
| android-tab | pass |  |  |

## Notes
Flow ready in YAML file for both andriod and IOS
