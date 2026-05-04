---
id: TC-MOR-002-006-2
title: Given a bug has a screenshot path that doesn't exist on disk When I ru
category: e-002-test-case-management
scenario: Negative
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-002-006
  - e-002
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-002-006
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-002-test-case-management/S-002-006-data-validation.md
  source_checksum: 7530bb4c8344e66f
---
## Steps
1. **Setup:** a bug has a screenshot path that doesn't exist on disk
2. **Action:** I run `morbius validate`
3. **Assert:** it is reported as a missing screenshot

## Expected Result
Given a bug has a screenshot path that doesn't exist on disk When I run `morbius validate` Then it is reported as a missing screenshot

