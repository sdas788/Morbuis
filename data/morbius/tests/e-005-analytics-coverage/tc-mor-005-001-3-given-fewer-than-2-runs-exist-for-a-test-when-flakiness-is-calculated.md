---
id: TC-MOR-005-001-3
title: Given fewer than 2 runs exist for a test When flakiness is calculated
category: e-005-analytics-coverage
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-005-001
  - e-005
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-005-001
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-005-analytics-coverage/S-005-001-flakiness-detection.md
  source_checksum: ccf1a396756e37e0
---
## Steps
1. **Setup:** fewer than 2 runs exist for a test
2. **Action:** flakiness is calculated
3. **Assert:** the test is excluded from the flaky list (insufficient data) ---

## Expected Result
Given fewer than 2 runs exist for a test When flakiness is calculated Then the test is excluded from the flaky list (insufficient data) ---

