---
id: TC-ROA-009-011-3
title: A second-account flow tries to view that participant from outside the group
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-009-011
  - e-009
created: '2026-06-05'
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-011
  ac_index: 2
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-011-implement-tf-003.md
  source_checksum: 343b329a2d4a76ba
---
## Steps
1. **Setup:** Journey B's privacy toggle to "group-only"
2. **Action:** a second-account flow tries to view that participant from outside the group
3. **Assert:** their profile is hidden per the privacy setting

## Expected Result
**TC-009-011-003** Given Journey B's privacy toggle to "group-only", when a second-account flow tries to view that participant from outside the group, then their profile is hidden per the privacy setting

