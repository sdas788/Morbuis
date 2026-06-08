---
id: TC-ROA-009-002-3
title: The QA agent signs in
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-009-002
  - e-009
created: '2026-06-05'
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-002
  ac_index: 2
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-002-p0-test-accounts.md
  source_checksum: 1deb4e79f0357c10
---
## Steps
1. **Setup:** `rs-test-returning-participant`
2. **Action:** the QA agent signs in
3. **Assert:** the documented profile baseline appears (avatar present, hometown "Chicago, IL", bio populated, 4 hobbies selected, default privacy)

## Expected Result
**TC-009-002-003** Given `rs-test-returning-participant`, when the QA agent signs in, then the documented profile baseline appears (avatar present, hometown "Chicago, IL", bio populated, 4 hobbies selected, default privacy)

