---
id: TC-MOR-017-003-2
title: Given Claude cannot confidently propose a replacement When confidence
category: e-017-self-healing-selectors
scenario: Negative
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-017-003
  - e-017
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-017-003
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-017-self-healing-selectors/S-017-003-claude-proposal.md
  source_checksum: 53a15890be5ab751
---
## Steps
1. **Setup:** Claude cannot confidently propose a replacement
2. **Action:** confidence < 0.5
3. **Assert:** the proposal is still stored but marked "low-confidence" and sent to review queue with that flag visible

## Expected Result
Given Claude cannot confidently propose a replacement When confidence < 0.5 Then the proposal is still stored but marked "low-confidence" and sent to review queue with that flag visible

