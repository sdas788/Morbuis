---
id: TC-ROA-009-014-6
title: The QA agent attempts POST /test/version-info
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P4
platforms:
  - android
  - ios
tags:
  - s-009-014
  - e-009
created: '2026-06-05'
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-014
  ac_index: 5
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-014-ios-airplane-version-url.md
  source_checksum: 4e4740e2d91ad757
---
## Steps
1. **Setup:** a Production build
2. **Action:** the QA agent attempts `POST /test/version-info`
3. **Assert:** the endpoint returns 404 (not registered in production)

## Expected Result
**TC-009-014-006** Given a Production build, when the QA agent attempts `POST /test/version-info`, then the endpoint returns 404 (not registered in production)

