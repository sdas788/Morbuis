---
id: TC-MOR-017-002-3
title: Given the snapshot is large (>100 KB) When stored Then it is compresse
category: e-017-self-healing-selectors
scenario: Detour
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-017-002
  - e-017
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-017-002
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-017-self-healing-selectors/S-017-002-hierarchy-snapshot.md
  source_checksum: 9e825227e099ffc2
---
## Steps
1. **Setup:** the snapshot is large (>100 KB)
2. **Action:** stored
3. **Assert:** it is compressed and truncated to the top N relevant subtrees around the failed selector's expected location ---

## Expected Result
Given the snapshot is large (>100 KB) When stored Then it is compressed and truncated to the top N relevant subtrees around the failed selector's expected location ---

