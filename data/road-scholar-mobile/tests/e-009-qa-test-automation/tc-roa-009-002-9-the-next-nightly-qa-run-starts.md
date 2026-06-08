---
id: TC-ROA-009-002-9
title: The next nightly QA run starts
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-009-002
  - e-009
created: '2026-06-05'
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-002
  ac_index: 8
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-002-p0-test-accounts.md
  source_checksum: b3858768367c79b3
---
## Steps
1. **Setup:** the cron fails
2. **Action:** the next nightly QA run starts
3. **Assert:** the suite detects the un-regenerated account state, marks affected journeys as `environment-blocked` (not failed), and Slack posts a clear alert

## Expected Result
**TC-009-002-009** Given the cron fails, when the next nightly QA run starts, then the suite detects the un-regenerated account state, marks affected journeys as `environment-blocked` (not failed), and Slack posts a clear alert

