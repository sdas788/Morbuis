---
id: TC-1.05
title: 'Negative: Required Field Validation - Negative'
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
  test/notifications/create_account_notifications_denied_flow.yaml
maestro_flow_ios: >-
  /Users/sdas/Micro-Air/micro-air-testing/IOS
  app/notifications/create_account_notifications_denied_flow.yaml
maestro_flow: >-
  /Users/sdas/Micro-Air/micro-air-testing/Andriod
  test/notifications/create_account_notifications_denied_flow.yaml
has_automation: true
---
## Steps
Negative: Required Field Validation

## Expected Result
Leave required field(s) blank → submit blocked with validation → no MFA step reached.

## Device Results
| Device | Status | Run | Timestamp |
|--------|--------|-----|----------|
| iphone | pass |  |  |
| android-tab | pass |  |  |

