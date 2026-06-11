---
id: TC-ROA-009-016-5
title: Both render as literal text with no JS execution
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P4
platforms:
  - android
  - ios
tags:
  - s-009-016
  - e-009
created: '2026-06-05'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-016
  ac_index: 4
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-016-implement-tf-006-anomaly.md
  source_checksum: 119d1a448b5b67ce
---
## Steps
1. **Setup:** the curated cases AC-STR-002 + AC-STR-003 (XSS)
2. **Action:** the flows run
3. **Assert:** both render as literal text with no JS execution

## Expected Result
**TC-009-016-005** Given the curated cases AC-STR-002 + AC-STR-003 (XSS), when the flows run, then both render as literal text with no JS execution

