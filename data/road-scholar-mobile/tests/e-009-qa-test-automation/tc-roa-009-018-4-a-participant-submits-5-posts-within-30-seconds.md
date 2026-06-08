---
id: TC-ROA-009-018-4
title: A participant submits 5 posts within 30 seconds
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-009-018
  - e-009
created: '2026-06-05'
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-018
  ac_index: 3
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-018-tf-002-alt-branch-coverage.md
  source_checksum: 324f46a74c94fc38
---
## Steps
1. **Setup:** the rapid-spam alt
2. **Action:** a participant submits 5 posts within 30 seconds
3. **Assert:** the throttle banner appears + subsequent submits are rate-limited

## Expected Result
**TC-009-018-004** Given the rapid-spam alt, when a participant submits 5 posts within 30 seconds, then the throttle banner appears + subsequent submits are rate-limited

