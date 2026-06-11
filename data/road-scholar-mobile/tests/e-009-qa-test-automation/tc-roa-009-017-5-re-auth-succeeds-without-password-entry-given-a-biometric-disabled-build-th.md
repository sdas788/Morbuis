---
id: TC-ROA-009-017-5
title: 'Re-auth succeeds without password entry; given a biometric-disabled build, th…'
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
  ac_index: 4
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-017-tf-001-alt-branch-coverage.md
  source_checksum: 68802308bfc517d6
---
## Steps
1. **Setup:** Journey C runs against a biometric-enabled build
2. **Action:** the participant authenticates via Touch/Face ID
3. **Assert:** re-auth succeeds without password entry; given a biometric-disabled build, the flow fails cleanly with the expected error message

## Expected Result
**TC-009-017-005** Given Journey C runs against a biometric-enabled build, when the participant authenticates via Touch/Face ID, then re-auth succeeds without password entry; given a biometric-disabled build, the flow fails cleanly with the expected error message

