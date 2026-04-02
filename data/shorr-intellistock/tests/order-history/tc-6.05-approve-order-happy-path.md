---
id: TC-6.05
title: Approve Order - Happy Path
category: order-history
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
  /Maestro-testing/.maestro/flows/order-history/TC_6_05_approve-order.yaml
maestro_flow_ios: >-
  /Users/sdas/QA testing
  /Maestro-testing/.maestro/flows/order-history/TC_6_05_approve-order.yaml
maestro_flow: >-
  /Users/sdas/QA testing
  /Maestro-testing/.maestro/flows/order-history/TC_6_05_approve-order.yaml
has_automation: true
---
## Steps
Approve Order

## Expected Result
If order requires approval, approver must enter a PO number before approving.  
User can approve order and see the status update on Order History and Order Details screens. 
Validate on new test order or previous order, depending on meta data added. Ensure that user cannot proceed without a PO number.

