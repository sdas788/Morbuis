---
id: TC-ROA-009-011-4
title: The participant returns to Profile after re-auth
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
  ac_index: 3
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-011-implement-tf-003.md
  source_checksum: b01d46ef6a762fdb
---
## Steps
1. **Setup:** Journey C's sign-out + sign-back-in cycle
2. **Action:** the participant returns to Profile after re-auth
3. **Assert:** all baseline profile data (avatar, hometown "Chicago, IL", bio, 4 hobbies, default privacy) is present

## Expected Result
**TC-009-011-004** Given Journey C's sign-out + sign-back-in cycle, when the participant returns to Profile after re-auth, then all baseline profile data (avatar, hometown "Chicago, IL", bio, 4 hobbies, default privacy) is present

