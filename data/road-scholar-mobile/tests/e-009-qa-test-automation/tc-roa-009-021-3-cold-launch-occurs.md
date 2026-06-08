---
id: TC-ROA-009-021-3
title: Cold launch occurs
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
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-021
  ac_index: 2
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-021-tf-005-alt-branch-coverage.md
  source_checksum: 79f7069a4b1f8445
---
## Steps
1. **Setup:** Journey D's malformed variant
2. **Action:** cold launch occurs
3. **Assert:** the app fails open (no Alert) and continues to Home — does NOT block the user

## Expected Result
**TC-009-021-003** Given Journey D's malformed variant, when cold launch occurs, then the app fails open (no Alert) and continues to Home — does NOT block the user

