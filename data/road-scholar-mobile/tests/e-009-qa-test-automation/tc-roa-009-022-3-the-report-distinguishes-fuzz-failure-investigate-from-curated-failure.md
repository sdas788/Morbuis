---
id: TC-ROA-009-022-3
title: The report distinguishes "fuzz failure (investigate)" from "curated failure (…
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P4
platforms:
  - android
  - ios
tags:
  - s-009-022
  - e-009
created: '2026-06-05'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-022
  ac_index: 2
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-022-faker-fuzz-harness.md
  source_checksum: f7204804744a3411
---
## Steps
1. **Setup:** the Slack flat-report fires after a fuzz run
2. **Action:** a failure occurred
3. **Assert:** the report distinguishes "fuzz failure (investigate)" from "curated failure (fix-before-ship)"

## Expected Result
**TC-009-022-003** Given the Slack flat-report fires after a fuzz run, when a failure occurred, then the report distinguishes "fuzz failure (investigate)" from "curated failure (fix-before-ship)"

