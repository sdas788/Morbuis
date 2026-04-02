---
id: TC-5.05
title: Subscription Management – Happy Path (View + Manage) - Happy Path
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
  test/user_management/subscription_management_happy_flow.yaml
maestro_flow_ios: >-
  /Users/sdas/Micro-Air/micro-air-testing/IOS
  app/user_management/subscription_management_happy_flow.yaml
maestro_flow: >-
  /Users/sdas/Micro-Air/micro-air-testing/Andriod
  test/user_management/subscription_management_happy_flow.yaml
has_automation: true
---
## Steps
Subscription Management – Happy Path (View + Manage)

## Expected Result
From My Account → Subscription Management. User can view current subscription status/plan (and renewal date if shown). If management opens a webview/vendor portal, it loads successfully and user can return back to the app without losing session. No crashes or blank webview.

## Device Results
| Device | Status | Run | Timestamp |
|--------|--------|-----|----------|
| iphone | pass |  |  |
| android-tab | pass |  |  |

