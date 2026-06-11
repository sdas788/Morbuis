---
id: TC-ROA-009-004-6
title: 'Bitrise kills the build, marks the PR check as red with a "timed out" message…'
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
  ac_index: 5
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-004-bitrise-pr-trigger.md
  source_checksum: 622bf32883a9cca5
---
## Steps
1. **Setup:** a flow hangs for 30+ minutes
2. **Action:** the timeout fires
3. **Assert:** Bitrise kills the build, marks the PR check as red with a "timed out" message, and uploads partial evidence

## Expected Result
**TC-009-004-006** Given a flow hangs for 30+ minutes, when the timeout fires, then Bitrise kills the build, marks the PR check as red with a "timed out" message, and uploads partial evidence

