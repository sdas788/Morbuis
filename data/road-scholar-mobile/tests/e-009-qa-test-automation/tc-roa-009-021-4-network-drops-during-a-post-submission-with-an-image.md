---
id: TC-ROA-009-021-4
title: Network drops during a post submission with an image
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
  ac_index: 3
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-021-tf-005-alt-branch-coverage.md
  source_checksum: 86ed8384d8388959
---
## Steps
1. **Setup:** the offline-mid-upload alt
2. **Action:** network drops during a post submission with an image
3. **Assert:** the post + image queue locally + replay successfully on reconnect

## Expected Result
**TC-009-021-004** Given the offline-mid-upload alt, when network drops during a post submission with an image, then the post + image queue locally + replay successfully on reconnect

