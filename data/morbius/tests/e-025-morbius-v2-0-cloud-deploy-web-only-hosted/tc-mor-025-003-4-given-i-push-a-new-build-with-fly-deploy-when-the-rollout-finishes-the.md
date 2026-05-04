---
id: TC-MOR-025-003-4
title: Given I push a new build with fly deploy When the rollout finishes The
category: e-025-morbius-v2-0-cloud-deploy-web-only-hosted
scenario: Detour
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-025-003
  - e-025
created: '2026-04-30'
updated: '2026-04-30'
pmagent_source:
  slug: morbius
  story_id: S-025-003
  ac_index: 3
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-025-cloud-deploy/S-025-003-fly-io-deploy-secrets.md
  source_checksum: 5370f4779b478a1d
---
## Steps
1. **Setup:** I push a new build with `fly deploy`
2. **Action:** the rollout finishes
3. **Assert:** the volume's data is preserved (projects, test cases, run history all intact post-rollout)

## Expected Result
Given I push a new build with `fly deploy` When the rollout finishes Then the volume's data is preserved (projects, test cases, run history all intact post-rollout)

