---
id: TC-MOR-025-007-7
title: Given the doc has a Rollout / Rollback section When I push a bad build
category: e-025-morbius-v2-0-cloud-deploy-web-only-hosted
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-025-007
  - e-025
created: '2026-04-30'
updated: '2026-04-30'
pmagent_source:
  slug: morbius
  story_id: S-025-007
  ac_index: 6
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-025-cloud-deploy/S-025-007-operator-runbook.md
  source_checksum: c3e4b845104e6c0b
---
## Steps
1. **Setup:** the doc has a Rollout / Rollback section
2. **Action:** I push a bad build
3. **Assert:** I can find the `fly releases list` + `fly deploy --image <prev-sha>` recipe to roll back in under 5 minutes

## Expected Result
Given the doc has a Rollout / Rollback section When I push a bad build Then I can find the `fly releases list` + `fly deploy --image <prev-sha>` recipe to roll back in under 5 minutes

