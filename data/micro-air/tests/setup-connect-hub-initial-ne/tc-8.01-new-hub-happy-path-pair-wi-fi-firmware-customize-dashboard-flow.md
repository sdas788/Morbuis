---
id: TC-8.01
title: New Hub – Happy Path (Pair → Wi-Fi → Firmware → Customize → Dashboard) - Flow
category: setup-connect-hub-initial-ne
scenario: Flow
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - flow
created: '2026-03-26'
updated: '2026-03-26'
maestro_flow_android: >-
  /Users/sdas/Micro-Air/micro-air-testing/Andriod
  test/setup/connect_new_hub_happy_flow.yaml
maestro_flow_ios: >-
  /Users/sdas/Micro-Air/micro-air-testing/IOS
  app/setup/connect_new_hub_happy_flow.yaml
maestro_flow: >-
  /Users/sdas/Micro-Air/micro-air-testing/Andriod
  test/setup/connect_new_hub_happy_flow.yaml
has_automation: true
---
## Steps
New Hub – Happy Path (Pair → Wi-Fi → Firmware → Customize → Dashboard)

## Expected Result
Precondition: user completed Create Account/Login and is on Dashboard/Hub Home with first-hub callout. Tap Connect a Hub → pairing instructions screen. Put new hub in pairing mode; app discovers hub and displays hub info (model, firmware version). User taps Accept/Pair and sees pairing success message. User selects Wi-Fi provisioning, selects a network from list, enters correct password, and hub connects successfully. If Firmware upgrade required screen appears, user accepts update and initiates it. App shows waiting state until hub returns online. User sees installation success popover showing new version #. User completes customization: Friendly Name, Vehicle Type = RV, Class Type = C, Brand, Model, Year. User returns to Dashboard/Hub Home and sees hub connected with status visible and actions available: configure hub, add another hub, add a sensor.

