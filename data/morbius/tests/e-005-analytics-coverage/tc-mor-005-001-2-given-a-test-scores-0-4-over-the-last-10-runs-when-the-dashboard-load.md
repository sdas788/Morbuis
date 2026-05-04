---
id: TC-MOR-005-001-2
title: Given a test scores ≥0.4 over the last 10 runs When the Dashboard load
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
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-005-analytics-coverage/S-005-001-flakiness-detection.md
  source_checksum: d82c060d81eb401d
---
## Steps
1. **Setup:** a test scores ≥0.4 over the last 10 runs
2. **Action:** the Dashboard loads
3. **Assert:** that test appears in the Flaky Tests section, ranked by score descending

## Expected Result
Given a test scores ≥0.4 over the last 10 runs When the Dashboard loads Then that test appears in the Flaky Tests section, ranked by score descending

