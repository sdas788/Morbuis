---
id: TC-ROA-009-015-5
title: The run report is produced
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P4
platforms:
  - android
  - ios
tags:
  - s-009-015
  - e-009
created: '2026-06-05'
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-015
  ac_index: 4
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-015-implement-tf-005.md
  source_checksum: 8872b07f197caf93
---
## Steps
1. **Setup:** a journey fails on a specific step
2. **Action:** the run report is produced
3. **Assert:** it includes the device's network state at failure (cellular / wifi / airplane), the step that failed, and the device log tail

## Expected Result
**TC-009-015-005** Given a journey fails on a specific step, when the run report is produced, then it includes the device's network state at failure (cellular / wifi / airplane), the step that failed, and the device log tail

