---
id: TC-ROA-009-005-2
title: No Slack message is posted
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-009-005
  - e-009
created: '2026-06-05'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-005
  ac_index: 1
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-005-slack-failure-alert.md
  source_checksum: 89bda6a764dbcff4
---
## Steps
1. **Setup:** a PR-E2E workflow passes
2. **Action:** the build finishes
3. **Assert:** no Slack message is posted

## Expected Result
**TC-009-005-002** Given a PR-E2E workflow passes, when the build finishes, then no Slack message is posted

