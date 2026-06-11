---
id: TC-ROA-009-004-2
title: The GitHub PR shows a green check named "PR E2E" with a link to the Bitrise b…
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
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-004
  ac_index: 1
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-004-bitrise-pr-trigger.md
  source_checksum: e1a678842e1d0c8d
---
## Steps
1. **Setup:** the `pr-e2e` workflow runs against a green build
2. **Action:** TF-001 passes
3. **Assert:** the GitHub PR shows a green check named "PR E2E" with a link to the Bitrise build

## Expected Result
**TC-009-004-002** Given the `pr-e2e` workflow runs against a green build, when TF-001 passes, then the GitHub PR shows a green check named "PR E2E" with a link to the Bitrise build

