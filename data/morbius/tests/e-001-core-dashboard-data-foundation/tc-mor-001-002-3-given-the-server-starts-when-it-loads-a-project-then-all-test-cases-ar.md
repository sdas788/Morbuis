---
id: TC-MOR-001-002-3
title: Given the server starts When it loads a project Then all test cases ar
category: e-001-core-dashboard-data-foundation
scenario: Detour
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-001-002
  - e-001
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-001-002
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-001-core-dashboard-foundation/S-001-002-markdown-database.md
  source_checksum: 8bd326714f3be61e
---
## Steps
1. **Setup:** the server starts
2. **Action:** it loads a project
3. **Assert:** all test cases are read from `data/{project}/tests/{category}/*.md` and all bugs from `data/{project}/bugs/*.md`

## Expected Result
Given the server starts When it loads a project Then all test cases are read from `data/{project}/tests/{category}/*.md` and all bugs from `data/{project}/bugs/*.md`

