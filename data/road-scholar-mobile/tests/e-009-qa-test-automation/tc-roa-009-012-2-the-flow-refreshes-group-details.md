---
id: TC-ROA-009-012-2
title: The flow refreshes Group Details
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-009-012
  - e-009
created: '2026-06-05'
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-012
  ac_index: 1
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-012-implement-tf-004.md
  source_checksum: cb5051d2343972e9
---
## Steps
1. **Setup:** the leader successfully joins a group
2. **Action:** the flow refreshes Group Details
3. **Assert:** the leader badge is visible + admin actions ("Manage Group", "Pin Post", "Delete Post") are accessible

## Expected Result
**TC-009-012-002** Given the leader successfully joins a group, when the flow refreshes Group Details, then the leader badge is visible + admin actions ("Manage Group", "Pin Post", "Delete Post") are accessible

