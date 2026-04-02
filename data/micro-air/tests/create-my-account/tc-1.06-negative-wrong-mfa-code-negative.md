---
id: TC-1.06
title: 'Negative: Wrong MFA Code - Negative'
category: create-my-account
scenario: Negative
status: pass
priority: P2
platforms:
  - ios
  - android
tags:
  - negative
created: '2026-03-26'
updated: '2026-03-26'
maestro_flow_android: >-
  /Users/sdas/Micro-Air/micro-air-testing/Andriod
  test/notifications/create_account_location_allow_once_flow.yaml
maestro_flow_ios: >-
  /Users/sdas/Micro-Air/micro-air-testing/IOS
  app/notifications/create_account_location_allow_once_flow.yaml
maestro_flow: >-
  /Users/sdas/Micro-Air/micro-air-testing/Andriod
  test/notifications/create_account_location_allow_once_flow.yaml
has_automation: true
---
## Steps
Negative: Wrong MFA Code

## Expected Result
Enter incorrect MFA code → error shown → user cannot reach Dashboard until correct code entered.

## Device Results
| Device | Status | Run | Timestamp |
|--------|--------|-----|----------|
| iphone | pass |  |  |
| android-tab | pass |  |  |

