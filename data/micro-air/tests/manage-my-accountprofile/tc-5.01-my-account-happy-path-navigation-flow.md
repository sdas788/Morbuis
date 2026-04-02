---
id: TC-5.01
title: My Account – Happy Path Navigation - Flow
category: manage-my-accountprofile
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
  test/user_management/manage_my_account_navigation_flow.yaml
maestro_flow_ios: >-
  /Users/sdas/Micro-Air/micro-air-testing/IOS
  app/user_management/manage_my_account_navigation_flow.yaml
maestro_flow: >-
  /Users/sdas/Micro-Air/micro-air-testing/Andriod
  test/user_management/manage_my_account_navigation_flow.yaml
has_automation: true
---
## Steps
My Account – Happy Path Navigation

## Expected Result
Start logged in on Dashboard/Home. Tap Account tab. User lands on My Account screen and can access these sections/actions: Update Profile Information, Change Password, Subscription Management, Delete Account, Log Out. All items are visible and tappable.

## Device Results
| Device | Status | Run | Timestamp |
|--------|--------|-----|----------|
| iphone | pass |  |  |
| android-tab | pass |  |  |

## Notes
Flow ready in YAML file for both andriod and IOS
