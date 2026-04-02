---
id: TC-1.02
title: 'Detour: Deny Notifications - Detour'
category: create-my-account
scenario: Detour
status: pass
priority: P2
platforms:
  - ios
  - android
tags:
  - detour
created: '2026-03-26'
updated: '2026-03-31'
maestro_flow_android: >-
  /Users/sdas/Micro-Air/micro-air-testing/Andriod
  test/user_management/create_account_password_policy_happy_flow.yaml
maestro_flow_ios: >-
  /Users/sdas/Micro-Air/micro-air-testing/IOS
  app/user_management/create_account_password_policy_happy_flow.yaml
maestro_flow: >-
  /Users/sdas/Micro-Air/micro-air-testing/Andriod
  test/user_management/create_account_password_policy_happy_flow.yaml
has_automation: true
order: 999
---
## Steps
Detour: Deny Notifications

## Expected Result
During onboarding, deny notifications → onboarding still completes → Dashboard loads.

## Device Results
| Device | Status | Run | Timestamp |
|--------|--------|-----|----------|
| iphone | pass |  |  |
| android-tab | pass |  |  |

## Changelog
| Timestamp | Field | Old Value | New Value | Actor |
|-----------|-------|-----------|-----------|-------|
| 2026-03-31T14:07:32.627Z | order | 999 | 999 | dashboard-reorder |
