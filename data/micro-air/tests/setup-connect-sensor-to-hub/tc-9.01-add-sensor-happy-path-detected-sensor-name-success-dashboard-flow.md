---
id: TC-9.01
title: Add Sensor – Happy Path (Detected Sensor → Name → Success → Dashboard) - Flow
category: setup-connect-sensor-to-hub
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
  test/setup/add_sensor_happy_flow.yaml
maestro_flow_ios: >-
  /Users/sdas/Micro-Air/micro-air-testing/IOS
  app/setup/add_sensor_happy_flow.yaml
maestro_flow: >-
  /Users/sdas/Micro-Air/micro-air-testing/Andriod
  test/setup/add_sensor_happy_flow.yaml
has_automation: true
---
## Steps
Add Sensor – Happy Path (Detected Sensor → Name → Success → Dashboard)

## Expected Result
Precondition: user is logged in, has an existing hub connected, and is on Dashboard/Hub Home. Tap Add New Sensor. App shows a list of detected/available sensors including key info (type, model, UID). User selects a detected sensor. User is prompted to customize sensor (Friendly Name), enters a valid name, and saves/continues. Sensor pairs successfully and user sees a success popover. User is returned to Dashboard/Hub Home where the sensor is listed with connection status visible and actions available: configure hub, add another hub, configure sensor, add a sensor.

