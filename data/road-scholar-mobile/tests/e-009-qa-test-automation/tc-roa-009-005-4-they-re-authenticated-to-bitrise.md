---
id: TC-ROA-009-005-4
title: They're authenticated to Bitrise
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
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-005
  ac_index: 3
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-005-slack-failure-alert.md
  source_checksum: 1baf007b05eba4fc
---
## Steps
1. **Setup:** an engineer clicks the evidence link in a Slack message
2. **Action:** they're authenticated to Bitrise
3. **Assert:** they land directly on the failed run's artifact page

## Expected Result
**TC-009-005-004** Given an engineer clicks the evidence link in a Slack message, when they're authenticated to Bitrise, then they land directly on the failed run's artifact page

