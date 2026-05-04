---
id: TC-MOR-004-002-3
title: Given I attach a screenshot via the CLI --screenshot <path> When the b
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
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-004-bug-management/S-004-002-manual-bug-creation.md
  source_checksum: 1216b57c77b6cd7f
---
## Steps
1. **Setup:** I attach a screenshot via the CLI `--screenshot <path>`
2. **Action:** the bug is created
3. **Assert:** the screenshot is copied to `data/{project}/screenshots/` and linked in the bug ---

## Expected Result
Given I attach a screenshot via the CLI `--screenshot <path>` When the bug is created Then the screenshot is copied to `data/{project}/screenshots/` and linked in the bug ---

