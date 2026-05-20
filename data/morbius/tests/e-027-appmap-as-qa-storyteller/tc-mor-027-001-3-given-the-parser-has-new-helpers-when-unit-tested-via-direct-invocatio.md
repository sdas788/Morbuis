---
id: TC-MOR-027-001-3
title: Given the parser has new helpers When unit-tested via direct invocatio
category: e-027-appmap-as-qa-storyteller
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-027-001
  - e-027
created: '2026-05-04'
updated: '2026-05-04'
pmagent_source:
  slug: morbius
  story_id: S-027-001
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-027-appmap-storyteller/S-027-001-narrative-data-model.md
  source_checksum: f16d83b33f655808
---
## Steps
1. **Setup:** the parser has new helpers
2. **Action:** unit-tested via direct invocation
3. **Assert:** `writeAppMapNarrative()` round-trips through `readAppMapNarrative()` without data loss

## Expected Result
Given the parser has new helpers When unit-tested via direct invocation Then `writeAppMapNarrative()` round-trips through `readAppMapNarrative()` without data loss

