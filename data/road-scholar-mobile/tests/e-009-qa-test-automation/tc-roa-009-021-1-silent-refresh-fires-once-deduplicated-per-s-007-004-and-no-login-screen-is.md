---
id: TC-ROA-009-021-1
title: Silent refresh fires once (deduplicated per S-007-004) and no Login screen is…
category: e-009-qa-test-automation
scenario: Happy Path
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
  ac_index: 0
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-021-tf-005-alt-branch-coverage.md
  source_checksum: cf51be8ed43288f7
---
## Steps
1. **Setup:** Journey C runs with token-backdate fired + 30min offline
2. **Action:** the device returns online
3. **Assert:** silent refresh fires once (deduplicated per S-007-004) and no Login screen is shown (RSS-437)

## Expected Result
**TC-009-021-001** Given Journey C runs with token-backdate fired + 30min offline, when the device returns online, then silent refresh fires once (deduplicated per S-007-004) and no Login screen is shown (RSS-437)

