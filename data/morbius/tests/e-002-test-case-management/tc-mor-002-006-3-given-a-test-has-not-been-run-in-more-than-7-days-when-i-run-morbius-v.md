---
id: TC-MOR-002-006-3
title: Given a test has not been run in more than 7 days When I run morbius v
category: e-002-test-case-management
scenario: Detour
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
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-002-test-case-management/S-002-006-data-validation.md
  source_checksum: bbc193d4f80c498f
---
## Steps
1. **Setup:** a test has not been run in more than 7 days
2. **Action:** I run `morbius validate`
3. **Assert:** it is flagged as stale

## Expected Result
Given a test has not been run in more than 7 days When I run `morbius validate` Then it is flagged as stale

