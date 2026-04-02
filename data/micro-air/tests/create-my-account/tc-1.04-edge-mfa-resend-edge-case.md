---
id: TC-1.04
title: 'Edge: MFA Resend - Edge Case'
category: create-my-account
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
  test/notifications/create_account_notifications_allowed_flow.yaml
maestro_flow_ios: >-
  /Users/sdas/Micro-Air/micro-air-testing/IOS
  app/notifications/create_account_notifications_allowed_flow.yaml
maestro_flow: >-
  /Users/sdas/Micro-Air/micro-air-testing/Andriod
  test/notifications/create_account_notifications_allowed_flow.yaml
has_automation: true
---
## Steps
Edge: MFA Resend

## Expected Result
On MFA screen, resend code → enter new code → account creation completes → Dashboard loads.

## Device Results
| Device | Status | Run | Timestamp |
|--------|--------|-----|----------|
| iphone | pass |  |  |
| android-tab | pass |  |  |

