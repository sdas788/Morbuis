---
id: TC-ROA-009-010-3
title: The deep link is not handled (app shows no action) and the screen route is no…
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
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-010
  ac_index: 2
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-010-token-backdate-harness.md
  source_checksum: 2f257927f81125e0
---
## Steps
1. **Setup:** a Release / Production build
2. **Action:** the QA agent attempts `roadscholar://debug/expire-token`
3. **Assert:** the deep link is not handled (app shows no action) and the screen route is not registered in production nav

## Expected Result
**TC-009-010-003** Given a Release / Production build, when the QA agent attempts `roadscholar://debug/expire-token`, then the deep link is not handled (app shows no action) and the screen route is not registered in production nav

