---
id: TC-ROA-009-009-2
title: The same suite runs against iOS (after S-009-006 lands Maestro Cloud)
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-009-009
  - e-009
created: '2026-06-05'
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-009
  ac_index: 1
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-009-implement-tf-002.md
  source_checksum: 8e644d4ce89c6b34
---
## Steps
1. **Setup:** the same RC build
2. **Action:** the same suite runs against iOS (after S-009-006 lands Maestro Cloud)
3. **Assert:** all 3 journeys pass — iOS-specific divergences are platform-suffixed

## Expected Result
**TC-009-009-002** Given the same RC build, when the same suite runs against iOS (after S-009-006 lands Maestro Cloud), then all 3 journeys pass — iOS-specific divergences are platform-suffixed

