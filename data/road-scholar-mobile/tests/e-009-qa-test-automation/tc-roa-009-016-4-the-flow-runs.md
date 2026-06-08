---
id: TC-ROA-009-016-4
title: The flow runs
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
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-016
  ac_index: 3
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-016-implement-tf-006-anomaly.md
  source_checksum: 31bed7db04b3026e
---
## Steps
1. **Setup:** the curated case AC-STR-001 (RTL override)
2. **Action:** the flow runs
3. **Assert:** the post renders with the override character either filtered or visually flagged — never silently inverting the rest of the body (security regression test)

## Expected Result
**TC-009-016-004** Given the curated case AC-STR-001 (RTL override), when the flow runs, then the post renders with the override character either filtered or visually flagged — never silently inverting the rest of the body (security regression test)

