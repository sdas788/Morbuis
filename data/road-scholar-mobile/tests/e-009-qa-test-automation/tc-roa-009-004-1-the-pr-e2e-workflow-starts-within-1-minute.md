---
id: TC-ROA-009-004-1
title: The pr-e2e workflow starts within 1 minute
category: e-009-qa-test-automation
scenario: Happy Path
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
  ac_index: 0
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-004-bitrise-pr-trigger.md
  source_checksum: 38d7dfd01fb8fdda
---
## Steps
1. **Setup:** a PR is opened against main
2. **Action:** the PR-update webhook fires Bitrise
3. **Assert:** the `pr-e2e` workflow starts within 1 minute

## Expected Result
**TC-009-004-001** Given a PR is opened against main, when the PR-update webhook fires Bitrise, then the `pr-e2e` workflow starts within 1 minute

