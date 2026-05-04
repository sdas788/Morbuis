---
id: TC-MOR-004-001-2
title: Given a bug for the same test + device already exists with status "ope
category: e-004-bug-management
scenario: Detour
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-004-001
  - e-004
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-004-001
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-004-bug-management/S-004-001-auto-create-bugs.md
  source_checksum: 892d57ccf793bf3a
---
## Steps
1. **Setup:** a bug for the same test + device already exists with status "open" or "investigating"
2. **Action:** the same test fails again
3. **Assert:** the existing bug is updated (not duplicated) and the new run is added to its history

## Expected Result
Given a bug for the same test + device already exists with status "open" or "investigating" When the same test fails again Then the existing bug is updated (not duplicated) and the new run is added to its history

