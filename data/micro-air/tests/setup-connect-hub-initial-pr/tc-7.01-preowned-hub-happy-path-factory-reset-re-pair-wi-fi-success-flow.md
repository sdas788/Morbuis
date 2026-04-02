---
id: TC-7.01
title: Preowned Hub – Happy Path (Factory Reset → Re-pair → Wi-Fi → Success) - Flow
category: setup-connect-hub-initial-pr
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
  test/setup/connect_preowned_hub_happy_flow.yaml
maestro_flow_ios: >-
  /Users/sdas/Micro-Air/micro-air-testing/IOS
  app/setup/connect_preowned_hub_happy_flow.yaml
maestro_flow: >-
  /Users/sdas/Micro-Air/micro-air-testing/Andriod
  test/setup/connect_preowned_hub_happy_flow.yaml
has_automation: true
---
## Steps
Preowned Hub – Happy Path (Factory Reset → Re-pair → Wi-Fi → Success)

## Expected Result
Precondition: user completed Create Account/Login and is on Dashboard/Hub Home with first-hub callout. Tap Connect a Hub → pairing instructions → discover hub → hub info (model, firmware version) shown → user accepts pairing → pairing success message shown. App detects hub is tethered to previous owner and presents options. User selects Factory Reset, confirms reset. System completes reset and shows factory reset success popover. User returns to Dashboard/Hub Home and can re-initiate Connect a Hub. User pairs the hub again successfully, then selects Wi-Fi provisioning, selects network, enters correct password. Hub connects and user sees Wi-Fi Connected Success page. Hub appears on Dashboard/Hub Home with connected status.

