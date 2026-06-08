---
id: TC-ROA-009-016-2
title: 'Yarn test:e2e:tf-006:fuzz runs against Android with date-derived seeds'
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P4
platforms:
  - android
  - ios
tags:
  - s-009-016
  - e-009
created: '2026-06-05'
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-016
  ac_index: 1
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-016-implement-tf-006-anomaly.md
  source_checksum: 2a18e1683b90a41e
---
## Steps
1. **Setup:** the 7 fuzz definitions are implemented
2. **Action:** `yarn test:e2e:tf-006:fuzz` runs against Android with date-derived seeds
3. **Assert:** each fuzz flow generates an input, exercises the surface, asserts no-crash + no-truncation + grapheme-correct render, and logs the seed + input to evidence

## Expected Result
**TC-009-016-002** Given the 7 fuzz definitions are implemented, when `yarn test:e2e:tf-006:fuzz` runs against Android with date-derived seeds, then each fuzz flow generates an input, exercises the surface, asserts no-crash + no-truncation + grapheme-correct render, and logs the seed + input to evidence

