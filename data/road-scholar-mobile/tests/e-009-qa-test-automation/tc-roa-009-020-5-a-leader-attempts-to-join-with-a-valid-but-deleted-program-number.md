---
id: TC-ROA-009-020-5
title: A leader attempts to join with a valid-but-deleted program number
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-009-020
  - e-009
created: '2026-06-05'
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-020
  ac_index: 4
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-020-tf-004-alt-branch-coverage.md
  source_checksum: 2fac1506d2ac06b7
---
## Steps
1. **Setup:** the deleted-group alt
2. **Action:** a leader attempts to join with a valid-but-deleted program number
3. **Assert:** a clear "group no longer available" message is shown

## Expected Result
**TC-009-020-005** Given the deleted-group alt, when a leader attempts to join with a valid-but-deleted program number, then a clear "group no longer available" message is shown

