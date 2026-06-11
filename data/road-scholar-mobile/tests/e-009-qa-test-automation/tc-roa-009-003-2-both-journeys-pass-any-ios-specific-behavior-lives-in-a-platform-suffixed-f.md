---
id: TC-ROA-009-003-2
title: Both journeys pass — any iOS-specific behavior lives in a platform-suffixed f…
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-009-003
  - e-009
created: '2026-06-05'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-003
  ac_index: 1
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-003-implement-tf-001.md
  source_checksum: f876d00e17e323d6
---
## Steps
1. **Setup:** the same RC build
2. **Action:** the suite runs against iOS sim
3. **Assert:** both journeys pass — any iOS-specific behavior lives in a platform-suffixed file, not as a runtime branch

## Expected Result
**TC-009-003-002** Given the same RC build, when the suite runs against iOS sim, then both journeys pass — any iOS-specific behavior lives in a platform-suffixed file, not as a runtime branch

