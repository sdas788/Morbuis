---
id: TC-ROA-009-001-5
title: They have to decide between assertVisible and assertWithAI for a new flow step
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
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-001
  ac_index: 4
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-001-maestro-scaffolding.md
  source_checksum: 7a62a52c3c31ca98
---
## Steps
1. **Setup:** an engineer reads `maestro/CONVENTIONS.md`
2. **Action:** they have to decide between `assertVisible` and `assertWithAI` for a new flow step
3. **Assert:** the doc gives them a clear rule (assertVisible for exact text / testID, assertWithAI for visual-state assertions that don't have a stable selector)

## Expected Result
**TC-009-001-005** Given an engineer reads `maestro/CONVENTIONS.md`, when they have to decide between `assertVisible` and `assertWithAI` for a new flow step, then the doc gives them a clear rule (assertVisible for exact text / testID, assertWithAI for visual-state assertions that don't have a stable selector)

