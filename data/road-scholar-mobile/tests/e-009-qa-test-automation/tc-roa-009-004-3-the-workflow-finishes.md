---
id: TC-ROA-009-004-3
title: The workflow finishes
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
  ac_index: 2
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-004-bitrise-pr-trigger.md
  source_checksum: eadc4451a09cf6bd
---
## Steps
1. **Setup:** a journey in TF-001 fails on a PR
2. **Action:** the workflow finishes
3. **Assert:** the GitHub PR check is red with the failing journey name in the summary line and a link to the evidence artifact

## Expected Result
**TC-009-004-003** Given a journey in TF-001 fails on a PR, when the workflow finishes, then the GitHub PR check is red with the failing journey name in the summary line and a link to the evidence artifact

