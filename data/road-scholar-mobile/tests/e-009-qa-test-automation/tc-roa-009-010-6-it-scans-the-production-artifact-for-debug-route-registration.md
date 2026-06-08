---
id: TC-ROA-009-010-6
title: It scans the production artifact for debug/ route registration
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-009-010
  - e-009
created: '2026-06-05'
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-010
  ac_index: 5
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-010-token-backdate-harness.md
  source_checksum: 57e902e12662a48b
---
## Steps
1. **Setup:** the CI release-build verification step runs
2. **Action:** it scans the production artifact for `__debug/` route registration
3. **Assert:** the step fails the build if any debug-only route is reachable

## Expected Result
**TC-009-010-006** Given the CI release-build verification step runs, when it scans the production artifact for `__debug/` route registration, then the step fails the build if any debug-only route is reachable

