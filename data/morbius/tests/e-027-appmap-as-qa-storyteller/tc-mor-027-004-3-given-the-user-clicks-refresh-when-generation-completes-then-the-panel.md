---
id: TC-MOR-027-004-3
title: Given the user clicks Refresh When generation completes Then the panel
category: e-027-appmap-as-qa-storyteller
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-027-004
  - e-027
created: '2026-05-04'
updated: '2026-05-04'
pmagent_source:
  slug: morbius
  story_id: S-027-004
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-027-appmap-storyteller/S-027-004-tab-ui-3-layer.md
  source_checksum: 7fb3c1f5fe75aa71
---
## Steps
1. **Setup:** the user clicks Refresh
2. **Action:** generation completes
3. **Assert:** the panel re-renders with a new `generatedAt`, and the previous content is overwritten

## Expected Result
Given the user clicks Refresh When generation completes Then the panel re-renders with a new `generatedAt`, and the previous content is overwritten

