---
id: TC-MOR-004-005-3
title: 'Given a YAML flow uses an index selector (index: 2) When analysed Then'
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
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-004-bug-management/S-004-005-selector-analysis.md
  source_checksum: 8000b293a2832cca
---
## Steps
1. **Setup:** a YAML flow uses an index selector (`index: 2`)
2. **Action:** analysed
3. **Assert:** a warning is shown: "index selector — fragile if list order changes"

## Expected Result
Given a YAML flow uses an index selector (`index: 2`) When analysed Then a warning is shown: "index selector — fragile if list order changes"

