---
id: TC-ROA-009-017-1
title: The error banner appears + retry succeeds with the right password on the same…
category: e-009-qa-test-automation
scenario: Negative
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-009-017
  - e-009
created: '2026-06-05'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-017
  ac_index: 0
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-017-tf-001-alt-branch-coverage.md
  source_checksum: d028b8ad9c9ebda2
---
## Steps
1. **Setup:** Journey D runs on Android
2. **Action:** wrong password is entered
3. **Assert:** the error banner appears + retry succeeds with the right password on the same screen (no app relaunch)

## Expected Result
**TC-009-017-001** Given Journey D runs on Android, when wrong password is entered, then the error banner appears + retry succeeds with the right password on the same screen (no app relaunch)

