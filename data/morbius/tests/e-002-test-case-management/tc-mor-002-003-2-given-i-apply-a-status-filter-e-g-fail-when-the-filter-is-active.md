---
id: TC-MOR-002-003-2
title: Given I apply a status filter (e.g. "Fail") When the filter is active
category: e-002-test-case-management
scenario: Negative
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-002-003
  - e-002
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-002-003
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-002-test-case-management/S-002-003-test-cases-kanban.md
  source_checksum: c36b32d085f20f99
---
## Steps
1. **Setup:** I apply a status filter (e.g. "Fail")
2. **Action:** the filter is active
3. **Assert:** only cards with that status are shown; empty columns auto-hide

## Expected Result
Given I apply a status filter (e.g. "Fail") When the filter is active Then only cards with that status are shown; empty columns auto-hide

