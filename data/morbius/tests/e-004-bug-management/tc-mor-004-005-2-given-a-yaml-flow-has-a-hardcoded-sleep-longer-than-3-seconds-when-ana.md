---
id: TC-MOR-004-005-2
title: Given a YAML flow has a hardcoded sleep longer than 3 seconds When ana
category: e-004-bug-management
scenario: Detour
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-004-005
  - e-004
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-004-005
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-004-bug-management/S-004-005-selector-analysis.md
  source_checksum: 2e13863d048d4f8e
---
## Steps
1. **Setup:** a YAML flow has a hardcoded `sleep` longer than 3 seconds
2. **Action:** analysed
3. **Assert:** a warning is shown: "hardcoded sleep >3s — flakiness risk"

## Expected Result
Given a YAML flow has a hardcoded `sleep` longer than 3 seconds When analysed Then a warning is shown: "hardcoded sleep >3s — flakiness risk"

