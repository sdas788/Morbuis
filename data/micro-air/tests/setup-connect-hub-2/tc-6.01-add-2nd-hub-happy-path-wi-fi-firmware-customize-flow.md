---
id: TC-6.01
title: Add 2nd+ Hub – Happy Path (Wi-Fi + Firmware + Customize) - Flow
category: setup-connect-hub-2
scenario: Flow
status: in-progress
priority: P2
platforms:
  - ios
tags:
  - flow
created: '2026-03-26'
updated: '2026-03-26'
maestro_flow_android: >-
  /Users/sdas/Micro-Air/micro-air-testing/Andriod
  test/setup/add_second_hub_happy_flow.yaml
maestro_flow_ios: >-
  /Users/sdas/Micro-Air/micro-air-testing/IOS
  app/setup/add_second_hub_happy_flow.yaml
maestro_flow: >-
  /Users/sdas/Micro-Air/micro-air-testing/Andriod
  test/setup/add_second_hub_happy_flow.yaml
has_automation: true
---
## Steps
Add 2nd+ Hub – Happy Path (Wi-Fi + Firmware + Customize)

## Expected Result
Precondition: user is logged in and already has at least 1 hub connected. From Dashboard/Hub Home, tap the “+” in header → select Add New Hub → Pairing instructions screen appears. Put hub in pairing mode, app discovers hub, displays hub info (model, firmware version). User taps Accept/Pair. Pairing succeeds and confirmation message is shown. User chooses Wi-Fi provisioning, selects a network from list, enters correct password, and hub connects successfully. If Firmware upgrade required screen appears, user accepts update and initiates it. App shows waiting state until hub returns online. User sees success popover with new firmware version #. User completes hub customization: Friendly Name, Vehicle Type = RV, Class Type = C, Brand, Model, Year. User returns to Dashboard/Hub Home where the new hub is present, shows correct connection status, and user can switch between hubs and still access: configure hub / add another hub / add sensor.

## Device Results
| Device | Status | Run | Timestamp |
|--------|--------|-----|----------|
| iphone | pass |  |  |

## Notes
Added HUB Max-Test for Staging Account 
User name: - f5qcb@dollicons.com
PW:- Qwer1234!
hub added with perfect flow and Hub added succuesfully, for IOS
