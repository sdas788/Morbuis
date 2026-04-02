---
id: TC-1.01
title: 'Happy Path: Create Account → MFA → Dashboard - Flow'
category: create-my-account
scenario: Flow
status: pass
priority: P2
platforms:
  - ios
  - android
tags:
  - flow
created: '2026-03-26'
updated: '2026-03-31'
maestro_flow_android: >-
  /Users/sdas/Micro-Air/micro-air-testing/Andriod
  test/user_management/create_account_happy_flow.yaml
maestro_flow_ios: >-
  /Users/sdas/Micro-Air/micro-air-testing/IOS
  app/user_management/create_account_happy_flow.yaml
maestro_flow: >-
  /Users/sdas/Micro-Air/micro-air-testing/Andriod
  test/user_management/create_account_happy_flow.yaml
has_automation: true
order: 999
---
## Steps
Happy Path: Create Account → MFA → Dashboard

## Expected Result
Create account with valid fields → submit → enter valid MFA code → proceed through permission prompts → land on Dashboard/Hub Home.

## Device Results
| Device | Status | Run | Timestamp |
|--------|--------|-----|----------|
| iphone | pass |  |  |
| android-tab | pass |  |  |

## Notes
Flow ready in YAML file for both andriod and IOS

## Changelog
| Timestamp | Field | Old Value | New Value | Actor |
|-----------|-------|-----------|-----------|-------|
| 2026-03-31T01:57:08.919Z | status | pass | in-progress | dashboard |
| 2026-03-31T01:57:33.208Z | status | in-progress | pass | dashboard |
| 2026-03-31T14:07:13.145Z | status | pass | in-progress | maestro-run |
| 2026-03-31T14:07:15.243Z | status | in-progress | fail | maestro-run |
| 2026-03-31T14:07:32.628Z | order | 999 | 999 | dashboard-reorder |
| 2026-03-31T14:07:37.695Z | status | fail | pass | dashboard |

