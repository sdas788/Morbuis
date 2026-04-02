---
id: TC-5.03
title: Change Password – Happy Path - Happy Path
category: manage-my-accountprofile
scenario: Happy Path
status: pass
priority: P2
platforms:
  - ios
  - android
tags:
  - happy-path
created: '2026-03-26'
updated: '2026-03-26'
maestro_flow_android: >-
  /Users/sdas/Micro-Air/micro-air-testing/Andriod
  test/user_management/change_password_happy_flow.yaml
maestro_flow_ios: >-
  /Users/sdas/Micro-Air/micro-air-testing/IOS
  app/user_management/change_password_happy_flow.yaml
maestro_flow: >-
  /Users/sdas/Micro-Air/micro-air-testing/Andriod
  test/user_management/change_password_happy_flow.yaml
has_automation: true
---
## Steps
Change Password – Happy Path

## Expected Result
From My Account → Change Password. Enter current password + new password that meets policy + confirm password. Submit. Password is updated successfully. User can log out and log in using new password; old password no longer works.

## Device Results
| Device | Status | Run | Timestamp |
|--------|--------|-----|----------|
| iphone | pass |  |  |
| android-tab | pass |  |  |

