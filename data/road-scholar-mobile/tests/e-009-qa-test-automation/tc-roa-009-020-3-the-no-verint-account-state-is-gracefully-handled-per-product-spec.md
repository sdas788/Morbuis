---
id: TC-ROA-009-020-3
title: The no-Verint-account state is gracefully handled per product spec
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
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-020
  ac_index: 2
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-020-tf-004-alt-branch-coverage.md
  source_checksum: 434ed266c330372b
---
## Steps
1. **Setup:** Journey C runs as a first-time leader without a Verint account
2. **Action:** they attempt to join their first group
3. **Assert:** the no-Verint-account state is gracefully handled per product spec

## Expected Result
**TC-009-020-003** Given Journey C runs as a first-time leader without a Verint account, when they attempt to join their first group, then the no-Verint-account state is gracefully handled per product spec

