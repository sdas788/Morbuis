---
id: TC-ROA-009-011-5
title: The flow refreshes Profile
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
  ac_index: 4
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-011-implement-tf-003.md
  source_checksum: 4a30a70162c3ed59
---
## Steps
1. **Setup:** Journey A's save with a hobby tag containing an emoji or non-ASCII character
2. **Action:** the flow refreshes Profile
3. **Assert:** the character renders correctly without truncation or substitution (basic special-character verification — TF-006 anomaly catalog covers the deep cases)

## Expected Result
**TC-009-011-005** Given Journey A's save with a hobby tag containing an emoji or non-ASCII character, when the flow refreshes Profile, then the character renders correctly without truncation or substitution (basic special-character verification — TF-006 anomaly catalog covers the deep cases)

