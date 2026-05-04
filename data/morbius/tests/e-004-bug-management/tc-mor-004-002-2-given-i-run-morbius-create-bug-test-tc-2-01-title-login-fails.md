---
id: TC-MOR-004-002-2
title: Given I run morbius create-bug --test TC-2.01 --title "Login fails" --
category: e-004-bug-management
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-004-002
  - e-004
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-004-002
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-004-bug-management/S-004-002-manual-bug-creation.md
  source_checksum: 82f5d5cad492e40b
---
## Steps
1. **Setup:** I run `morbius create-bug --test TC-2.01 --title "Login fails" --device iPhone --priority high`
2. **Action:** the command runs
3. **Assert:** a bug markdown file is written with the provided fields and an auto-generated ID (bug-NNN)

## Expected Result
Given I run `morbius create-bug --test TC-2.01 --title "Login fails" --device iPhone --priority high` When the command runs Then a bug markdown file is written with the provided fields and an auto-generated ID (bug-NNN)

