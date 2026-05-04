---
id: TC-MOR-025-005-2
title: Given the cloud Morbius is up When a user clicks "Transfer from PMAgen
category: e-025-morbius-v2-0-cloud-deploy-web-only-hosted
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-025-005
  - e-025
created: '2026-04-30'
updated: '2026-04-30'
pmagent_source:
  slug: morbius
  story_id: S-025-005
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-025-cloud-deploy/S-025-005-pmagent-repo-checkout.md
  source_checksum: 71c548f8f1ea981f
---
## Steps
1. **Setup:** the cloud Morbius is up
2. **Action:** a user clicks "Transfer from PMAgent" with `slug=morbius` from the dashboard
3. **Assert:** the existing transfer pipeline (E-023) runs against the cloud-checked-out repo and creates / updates Morbius test cases — no laptop required

## Expected Result
Given the cloud Morbius is up When a user clicks "Transfer from PMAgent" with `slug=morbius` from the dashboard Then the existing transfer pipeline (E-023) runs against the cloud-checked-out repo and creates / updates Morbius test cases — no laptop required

