---
id: TC-ROA-009-006-3
title: The run's evidence directory is present with all screenshots organized per-fl…
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-009-006
  - e-009
created: '2026-06-05'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-006
  ac_index: 2
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-006-maestro-cloud-nightly.md
  source_checksum: af5ea0cd71b6699c
---
## Steps
1. **Setup:** a nightly run completes
2. **Action:** the QA agent checks `s3://roadscholar-qa-evidence/{YYYY-MM-DD}/`
3. **Assert:** the run's evidence directory is present with all screenshots organized per-flow / per-checkpoint

## Expected Result
**TC-009-006-003** Given a nightly run completes, when the QA agent checks `s3://roadscholar-qa-evidence/{YYYY-MM-DD}/`, then the run's evidence directory is present with all screenshots organized per-flow / per-checkpoint

