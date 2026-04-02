---
id: TC-5.03
title: View Needed QTY - Happy Path
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
  /Maestro-testing/.maestro/flows/new-order/TC_5_03_view-needed-qty.yaml
maestro_flow_ios: >-
  /Users/sdas/QA testing
  /Maestro-testing/.maestro/flows/new-order/TC_5_03_view-needed-qty.yaml
maestro_flow: >-
  /Users/sdas/QA testing
  /Maestro-testing/.maestro/flows/new-order/TC_5_03_view-needed-qty.yaml
has_automation: true
---
## Steps
View Needed QTY

## Expected Result
Needed QTY is a calculation based on current inventory count, open orders, and min/max inventory units. 
For example, if I have a minimum inventory value of 100, I have 50 units in stock, and 25 units on the way, my needed QTY would be 25.
Ensure that Needed QTY displayed is prefilled into the order input.

## Notes
Test Note: Compared 2.0.19 to RN 2.0.19
