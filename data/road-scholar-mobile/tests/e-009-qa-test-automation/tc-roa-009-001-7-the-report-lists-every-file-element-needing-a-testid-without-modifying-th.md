---
id: TC-ROA-009-001-7
title: The report lists every file + element needing a testID — without modifying th…
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-009-001
  - e-009
created: '2026-06-05'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-001
  ac_index: 6
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-001-maestro-scaffolding.md
  source_checksum: f318a8a906de9cd8
---
## Steps
1. **Setup:** the testID audit catches existing `src/` files without testIDs on tappable elements
2. **Action:** the engineer runs the audit one-time-fix script
3. **Assert:** the report lists every file + element needing a testID — without modifying the code (lint is on; auto-fix is not)

## Expected Result
**TC-009-001-006** Given the testID audit catches existing `src/` files without testIDs on tappable elements, when the engineer runs the audit one-time-fix script, then the report lists every file + element needing a testID — without modifying the code (lint is on; auto-fix is not)

