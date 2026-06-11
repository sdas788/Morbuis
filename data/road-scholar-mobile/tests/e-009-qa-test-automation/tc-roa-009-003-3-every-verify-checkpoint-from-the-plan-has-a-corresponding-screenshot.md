---
id: TC-ROA-009-003-3
title: 'Every ✓ Verify: checkpoint from the plan has a corresponding screenshot'
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
  ac_index: 2
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-003-implement-tf-001.md
  source_checksum: 7c0a41a4cd069bfa
---
## Steps
1. **Setup:** a journey passes
2. **Action:** the QA agent inspects `evidence/tf-001/journey-X/`
3. **Assert:** every `✓ Verify:` checkpoint from the plan has a corresponding screenshot

## Expected Result
**TC-009-003-003** Given a journey passes, when the QA agent inspects `evidence/tf-001/journey-X/`, then every `✓ Verify:` checkpoint from the plan has a corresponding screenshot

