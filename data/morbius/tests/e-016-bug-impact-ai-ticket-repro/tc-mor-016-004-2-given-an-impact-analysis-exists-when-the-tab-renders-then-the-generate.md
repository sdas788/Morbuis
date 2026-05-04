---
id: TC-MOR-016-004-2
title: Given an impact analysis exists When the tab renders Then the generate
category: e-016-bug-impact-ai-ticket-repro
scenario: Detour
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-016-004
  - e-016
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-016-004
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-016-bug-impact-ai/S-016-004-impact-tab-ui.md
  source_checksum: b24206e01b1dde9b
---
## Steps
1. **Setup:** an impact analysis exists
2. **Action:** the tab renders
3. **Assert:** the generatedAt timestamp and risk score are prominent; a "Regenerate" button triggers a fresh run

## Expected Result
Given an impact analysis exists When the tab renders Then the generatedAt timestamp and risk score are prominent; a "Regenerate" button triggers a fresh run

