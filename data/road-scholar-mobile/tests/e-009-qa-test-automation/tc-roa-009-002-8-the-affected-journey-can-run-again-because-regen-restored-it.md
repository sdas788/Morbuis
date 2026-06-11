---
id: TC-ROA-009-002-8
title: The affected journey can run again because regen restored it
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-009-002
  - e-009
created: '2026-06-05'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-002
  ac_index: 7
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-002-p0-test-accounts.md
  source_checksum: 5f81d2492b40f79c
---
## Steps
1. **Setup:** any TF journey ran the previous evening and consumed a mutating account
2. **Action:** the next morning's nightly QA suite runs
3. **Assert:** the affected journey can run again because regen restored it

## Expected Result
**TC-009-002-008** Given any TF journey ran the previous evening and consumed a mutating account, when the next morning's nightly QA suite runs, then the affected journey can run again because regen restored it

