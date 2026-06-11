---
id: TC-ROA-009-020-1
title: >-
  A clear "no group found" error is shown + retry succeeds with the correct
  number
category: e-009-qa-test-automation
scenario: Negative
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
  ac_index: 0
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-020-tf-004-alt-branch-coverage.md
  source_checksum: bb8259dfcb900d00
---
## Steps
1. **Setup:** Journey B runs and a leader mistypes a program number
2. **Action:** they enter the wrong number
3. **Assert:** a clear "no group found" error is shown + retry succeeds with the correct number

## Expected Result
**TC-009-020-001** Given Journey B runs and a leader mistypes a program number, when they enter the wrong number, then a clear "no group found" error is shown + retry succeeds with the correct number

