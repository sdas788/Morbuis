---
id: TC-5.04
title: Update Stock/Drop - Happy Path
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
  /Maestro-testing/.maestro/flows/new-order/TC_5_04_update-stock-drop.yaml
maestro_flow_ios: >-
  /Users/sdas/QA testing
  /Maestro-testing/.maestro/flows/new-order/TC_5_04_update-stock-drop.yaml
maestro_flow: >-
  /Users/sdas/QA testing
  /Maestro-testing/.maestro/flows/new-order/TC_5_04_update-stock-drop.yaml
has_automation: true
---
## Steps
Update Stock/Drop

## Expected Result
User can update a product to be stock or drop via the product settings - If a product is set up as a dropshipped product, the "Type" dropdown should be prefilled with drop.
User can manually update a typically stocked item to be dropshipped and vice versa. When item is dropshipped, the row will not display warehouse availability or estimated delivery date.

