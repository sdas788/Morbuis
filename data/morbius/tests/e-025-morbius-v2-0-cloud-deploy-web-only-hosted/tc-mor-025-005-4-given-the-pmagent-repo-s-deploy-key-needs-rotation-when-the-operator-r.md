---
id: TC-MOR-025-005-4
title: Given the PMAgent repo's deploy key needs rotation When the operator r
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
  ac_index: 3
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-025-cloud-deploy/S-025-005-pmagent-repo-checkout.md
  source_checksum: 091b048a4a7eb1f4
---
## Steps
1. **Setup:** the PMAgent repo's deploy key needs rotation
2. **Action:** the operator rotates the Fly secret
3. **Assert:** the next container restart uses the new credential without any code change; the rotation procedure is documented in the operator runbook (S-025-007)

## Expected Result
Given the PMAgent repo's deploy key needs rotation When the operator rotates the Fly secret Then the next container restart uses the new credential without any code change; the rotation procedure is documented in the operator runbook (S-025-007)

