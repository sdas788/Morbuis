---
id: TC-3.01
title: Forgot Password  (Reset + Auto Login) - Flow
category: forgot-passwordchange-password
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
  test/user_management/forgot_password_happy_flow.yaml
maestro_flow_ios: >-
  /Users/sdas/Micro-Air/micro-air-testing/IOS
  app/user_management/forgot_password_happy_flow.yaml
maestro_flow: >-
  /Users/sdas/Micro-Air/micro-air-testing/Andriod
  test/user_management/forgot_password_happy_flow.yaml
has_automation: true
---
## Steps
Forgot Password  (Reset + Auto Login)

## Expected Result
Launch app → Welcome/Login. Enter valid email with incorrect password to simulate “forgotten” scenario. Tap Forgot Password?. Enter registered email and submit. User is taken to MFA Reset screen (6-digit code + New Password + Confirm Password). Retrieve code from email, enter valid code + compliant new password + matching confirm password, submit. Password updates successfully and user is redirected to Dashboard/Hub Home authenticated/logged in.

## Device Results
| Device | Status | Run | Timestamp |
|--------|--------|-----|----------|
| iphone | pass |  |  |
| android-tab | pass |  |  |

## Notes
Flow ready in YAML file for both andriod and IOS
