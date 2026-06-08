---
id: TC-ROA-009-020-4
title: Two leaders attempt the same program number within 5s
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
  ac_index: 3
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-020-tf-004-alt-branch-coverage.md
  source_checksum: a1a3ee8e79876437
---
## Steps
1. **Setup:** the concurrent-join alt
2. **Action:** two leaders attempt the same program number within 5s
3. **Assert:** both succeed (no race condition) OR the documented spec for handling is followed

## Expected Result
**TC-009-020-004** Given the concurrent-join alt, when two leaders attempt the same program number within 5s, then both succeed (no race condition) OR the documented spec for handling is followed

