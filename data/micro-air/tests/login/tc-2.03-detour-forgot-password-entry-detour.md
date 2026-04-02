---
id: TC-2.03
title: 'Detour: Forgot Password entry - Detour'
category: login
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
  test/user_management/login_password_mask_toggle_happy_flow.yaml
maestro_flow_ios: >-
  /Users/sdas/Micro-Air/micro-air-testing/IOS
  app/user_management/login_password_mask_toggle_happy_flow.yaml
maestro_flow: >-
  /Users/sdas/Micro-Air/micro-air-testing/Andriod
  test/user_management/login_password_mask_toggle_happy_flow.yaml
has_automation: true
---
## Steps
Detour: Forgot Password entry

## Expected Result
From Login → tap Forgot Password → submit registered email → confirmation shown (reset initiated) → can return to Login.

## Device Results
| Device | Status | Run | Timestamp |
|--------|--------|-----|----------|
| iphone | pass |  |  |
| android-tab | pass |  |  |

