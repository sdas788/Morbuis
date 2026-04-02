---
id: TC-4.01
title: Delete My Account – Happy Path (Confirm Delete) - Flow
category: delete-my-account
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
  test/user_management/delete_my_account_happy_flow.yaml
maestro_flow_ios: >-
  /Users/sdas/Micro-Air/micro-air-testing/IOS
  app/user_management/delete_my_account_happy_flow.yaml
maestro_flow: >-
  /Users/sdas/Micro-Air/micro-air-testing/Andriod
  test/user_management/delete_my_account_happy_flow.yaml
has_automation: true
---
## Steps
Delete My Account – Happy Path (Confirm Delete)

## Expected Result
Start logged in on Home/Dashboard. Tap Account tab in bottom nav → Account page. Tap Delete My Account. Confirmation modal appears. User confirms deletion. Account is deleted successfully and user is logged out and returned to Welcome/Login screen. Any authenticated pages are no longer accessible.

## Device Results
| Device | Status | Run | Timestamp |
|--------|--------|-----|----------|
| iphone | pass |  |  |
| android-tab | fail |  |  |

## Notes
Flow ready in YAML file for both andriod and IOS- Delete account button working but even after deleting the i can still login to the account
