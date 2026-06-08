---
id: TC-ROA-009-006-1
title: '02:00 America/Chicago arrives'
category: e-009-qa-test-automation
scenario: Happy Path
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-009-006
  - e-009
created: '2026-06-05'
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-006
  ac_index: 0
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-006-maestro-cloud-nightly.md
  source_checksum: 0e1a3287876b12bb
---
## Steps
1. **Setup:** the nightly workflow is scheduled in Bitrise
2. **Action:** 02:00 America/Chicago arrives
3. **Assert:** the workflow runs without manual intervention and uploads to Maestro Cloud

## Expected Result
**TC-009-006-001** Given the nightly workflow is scheduled in Bitrise, when 02:00 America/Chicago arrives, then the workflow runs without manual intervention and uploads to Maestro Cloud

