---
id: TC-MOR-015-002-2
title: Given a test case has run on multiple devices When the detail view ope
category: e-015-test-case-detail-depth
scenario: Negative
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-015-002
  - e-015
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-015-002
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-015-test-case-detail-depth/S-015-002-yaml-device-coverage.md
  source_checksum: c0e1fc14cfbaabba
---
## Steps
1. **Setup:** a test case has run on multiple devices
2. **Action:** the detail view opens
3. **Assert:** a "Device Coverage" section shows a grid of (device × pass/fail/not-run) status (reusing E-005 device matrix data)

## Expected Result
Given a test case has run on multiple devices When the detail view opens Then a "Device Coverage" section shows a grid of (device × pass/fail/not-run) status (reusing E-005 device matrix data)

