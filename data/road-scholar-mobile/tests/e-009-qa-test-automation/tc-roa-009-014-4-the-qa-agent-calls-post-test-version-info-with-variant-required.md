---
id: TC-ROA-009-014-4
title: 'The QA agent calls POST /test/version-info with variant: ''required'''
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
  ac_index: 3
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-014-ios-airplane-version-url.md
  source_checksum: 2aac6a64478a2305
---
## Steps
1. **Setup:** the publisher endpoint
2. **Action:** the QA agent calls `POST /test/version-info` with `variant: 'required'`
3. **Assert:** the URL returned points at a JSON with `requiredVersion` higher than any installed build

## Expected Result
**TC-009-014-004** Given the publisher endpoint, when the QA agent calls `POST /test/version-info` with `variant: 'required'`, then the URL returned points at a JSON with `requiredVersion` higher than any installed build

