---
id: TC-MOR-005-002-3
title: Given a test has a lastRun timestamp older than 7 days When the Dashbo
category: e-005-analytics-coverage
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-005-002
  - e-005
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-005-002
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-005-analytics-coverage/S-005-002-coverage-gaps.md
  source_checksum: 2b4dff17e27d7f50
---
## Steps
1. **Setup:** a test has a `lastRun` timestamp older than 7 days
2. **Action:** the Dashboard loads
3. **Assert:** it appears in Coverage Gaps as "stale — not run in X days"

## Expected Result
Given a test has a `lastRun` timestamp older than 7 days When the Dashboard loads Then it appears in Coverage Gaps as "stale — not run in X days"

