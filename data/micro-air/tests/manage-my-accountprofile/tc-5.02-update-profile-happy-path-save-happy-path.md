---
id: TC-5.02
title: Update Profile – Happy Path (Save) - Happy Path
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
  test/user_management/update_profile_happy_flow.yaml
maestro_flow_ios: >-
  /Users/sdas/Micro-Air/micro-air-testing/IOS
  app/user_management/update_profile_happy_flow.yaml
maestro_flow: >-
  /Users/sdas/Micro-Air/micro-air-testing/Andriod
  test/user_management/update_profile_happy_flow.yaml
has_automation: true
---
## Steps
Update Profile – Happy Path (Save)

## Expected Result
From My Account → Update Profile Information. Edit allowed fields (e.g., name/phone as supported) and tap Save. Success confirmation shown. Returning to My Account (or reopening profile) displays updated values. Changes persist after app restart.

## Device Results
| Device | Status | Run | Timestamp |
|--------|--------|-----|----------|
| iphone | pass |  |  |
| android-tab | pass |  |  |

## Notes
Test passed
