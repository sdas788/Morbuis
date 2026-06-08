---
id: TC-ROA-009-004-5
title: An engineer searches for the test account credentials
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-009-004
  - e-009
created: '2026-06-05'
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-004
  ac_index: 4
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-004-bitrise-pr-trigger.md
  source_checksum: ba386c2e2423dbbb
---
## Steps
1. **Setup:** the workflow logs are inspected after a run
2. **Action:** an engineer searches for the test account credentials
3. **Assert:** no plaintext password is present — only the Bitrise secret reference

## Expected Result
**TC-009-004-005** Given the workflow logs are inspected after a run, when an engineer searches for the test account credentials, then no plaintext password is present — only the Bitrise secret reference

