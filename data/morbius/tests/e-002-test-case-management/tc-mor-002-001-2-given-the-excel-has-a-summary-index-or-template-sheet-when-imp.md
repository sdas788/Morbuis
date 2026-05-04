---
id: TC-MOR-002-001-2
title: 'Given the Excel has a "Summary", "Index", or "Template" sheet When imp'
category: e-002-test-case-management
scenario: Detour
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-002-001
  - e-002
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-002-001
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-002-test-case-management/S-002-001-import-from-excel.md
  source_checksum: d24189a32a446b97
---
## Steps
1. **Setup:** the Excel has a "Summary", "Index", or "Template" sheet
2. **Action:** import runs
3. **Assert:** those sheets are silently skipped

## Expected Result
Given the Excel has a "Summary", "Index", or "Template" sheet When import runs Then those sheets are silently skipped

