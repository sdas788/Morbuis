---
id: TC-ROA-009-017-4
title: Connectivity returns
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-009-017
  - e-009
created: '2026-06-05'
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-017
  ac_index: 3
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-017-tf-001-alt-branch-coverage.md
  source_checksum: 08e14e5acc348a9b
---
## Steps
1. **Setup:** Journey E runs and connectivity drops mid-onboarding
2. **Action:** connectivity returns
3. **Assert:** onboarding resumes from the last-saved step with no data loss

## Expected Result
**TC-009-017-004** Given Journey E runs and connectivity drops mid-onboarding, when connectivity returns, then onboarding resumes from the last-saved step with no data loss

