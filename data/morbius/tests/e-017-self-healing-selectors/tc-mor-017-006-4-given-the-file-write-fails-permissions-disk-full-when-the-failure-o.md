---
id: TC-MOR-017-006-4
title: 'Given the file write fails (permissions, disk full) When the failure o'
category: e-017-self-healing-selectors
scenario: Detour
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-017-006
  - e-017
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-017-006
  ac_index: 3
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-017-self-healing-selectors/S-017-006-yaml-update.md
  source_checksum: 89eedf572192d3da
---
## Steps
1. **Setup:** the file write fails (permissions, disk full)
2. **Action:** the failure occurs
3. **Assert:** the proposal stays in "approved" state (not "applied") so the user can retry ---

## Expected Result
Given the file write fails (permissions, disk full) When the failure occurs Then the proposal stays in "approved" state (not "applied") so the user can retry ---

