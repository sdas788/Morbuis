---
id: TC-ROA-009-021-6
title: The participant is gracefully gated (modal or redirect to store) without data…
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-009-021
  - e-009
created: '2026-06-05'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-021
  ac_index: 5
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-021-tf-005-alt-branch-coverage.md
  source_checksum: edebc0f47d02f3f1
---
## Steps
1. **Setup:** the force-update-mid-session alt
2. **Action:** the version-check fires while the app is in foreground
3. **Assert:** the participant is gracefully gated (modal or redirect to store) without data loss

## Expected Result
**TC-009-021-006** Given the force-update-mid-session alt, when the version-check fires while the app is in foreground, then the participant is gracefully gated (modal or redirect to store) without data loss

