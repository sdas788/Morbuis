---
id: TC-4.01
title: View Products - Category - Happy Path
category: inventory-counts
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
  /Maestro-testing/.maestro/flows/inventory-counts/TC_4_01_view-products-category.yaml
maestro_flow_ios: >-
  /Users/sdas/QA testing
  /Maestro-testing/.maestro/flows/inventory-counts/TC_4_01_view-products-category.yaml
maestro_flow: >-
  /Users/sdas/QA testing
  /Maestro-testing/.maestro/flows/inventory-counts/TC_4_01_view-products-category.yaml
has_automation: true
---
## Steps
View Products - Category

## Expected Result
User can view products grouped by category 
If product does not have location, user will be view the product, but unable to enter a count. 
If product has multiple locations, there will be sub rows for each additional location.

