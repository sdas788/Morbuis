---
id: TC-ROA-009-021-2
title: The expected Alert behavior fires per S-007-004's ACs (force / recommend / no…
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-009-021
  - e-009
created: '2026-06-05'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-021
  ac_index: 1
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-021-tf-005-alt-branch-coverage.md
  source_checksum: 50c6c8f40862741e
---
## Steps
1. **Setup:** Journey D cycles through all 4 VERSION_INFO_URL variants on cold launch
2. **Action:** each variant publishes
3. **Assert:** the expected Alert behavior fires per S-007-004's ACs (force / recommend / none / malformed)

## Expected Result
**TC-009-021-002** Given Journey D cycles through all 4 VERSION_INFO_URL variants on cold launch, when each variant publishes, then the expected Alert behavior fires per S-007-004's ACs (force / recommend / none / malformed)

