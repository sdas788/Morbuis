---
id: TC-7.12
title: Cancel Add/Update - Negative
category: products
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - negative
created: '2026-03-26'
updated: '2026-03-26'
maestro_flow_android: >-
  /Users/sdas/QA testing
  /Maestro-testing/.maestro/flows/products/TC_7_12_cancel-add-update.yaml
maestro_flow_ios: >-
  /Users/sdas/QA testing
  /Maestro-testing/.maestro/flows/products/TC_7_12_cancel-add-update.yaml
maestro_flow: >-
  /Users/sdas/QA testing
  /Maestro-testing/.maestro/flows/products/TC_7_12_cancel-add-update.yaml
has_automation: true
---
## Steps
Cancel Add/Update

## Expected Result
User can decide they do not want to add a product to their facility or edit a product in their facility. 
Ensure when user taps "Cancel" on first step of the product set up modal, the product is not added. 
Ensure when user taps X icon on the first step of product edit, any changes are not saved. Test by changing Customer Product Number.

