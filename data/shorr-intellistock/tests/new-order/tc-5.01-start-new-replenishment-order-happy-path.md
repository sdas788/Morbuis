---
id: TC-5.01
title: Start New Replenishment Order - Happy Path
category: new-order
scenario: Happy Path
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - happy-path
created: '2026-03-26'
updated: '2026-03-26'
maestro_flow_android: >-
  /Users/sdas/QA testing
  /Maestro-testing/.maestro/flows/new-order/TC_5_01_start-new-replenishment-order.yaml
maestro_flow_ios: >-
  /Users/sdas/QA testing
  /Maestro-testing/.maestro/flows/new-order/TC_5_01_start-new-replenishment-order.yaml
maestro_flow: >-
  /Users/sdas/QA testing
  /Maestro-testing/.maestro/flows/new-order/TC_5_01_start-new-replenishment-order.yaml
has_automation: true
---
## Steps
Start New Replenishment Order

## Expected Result
User can navigate to the new order screen. 
User can see products loading. 
By default, user will begin a replenishment order (versus a blank order). Replenishment orders will have needed QTY filled out in the QTY input. If there is a 0 or negative needed QTY, the QTY input will be set to 0.

