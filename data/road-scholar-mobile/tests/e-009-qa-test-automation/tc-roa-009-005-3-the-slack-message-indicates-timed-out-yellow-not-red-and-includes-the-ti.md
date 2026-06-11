---
id: TC-ROA-009-005-3
title: 'The Slack message indicates "timed out" (yellow, not red) and includes the ti…'
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
  ac_index: 2
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-005-slack-failure-alert.md
  source_checksum: ce4fc196faf19a4b
---
## Steps
1. **Setup:** a flow times out
2. **Action:** the timeout fires
3. **Assert:** the Slack message indicates "timed out" (yellow, not red) and includes the timeout duration

## Expected Result
**TC-009-005-003** Given a flow times out, when the timeout fires, then the Slack message indicates "timed out" (yellow, not red) and includes the timeout duration

