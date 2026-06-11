---
id: TC-ROA-009-016-9
title: The suite picks it up automatically on the next nightly run
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
  ac_index: 8
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-016-implement-tf-006-anomaly.md
  source_checksum: 3c15ab16deb9a84c
---
## Steps
1. **Setup:** a new fuzz category is added to TF-006 by the PM (e.g. a new surface)
2. **Action:** the corresponding `scripts/fuzz/{surface}.js` + flow are committed
3. **Assert:** the suite picks it up automatically on the next nightly run

## Expected Result
**TC-009-016-009** Given a new fuzz category is added to TF-006 by the PM (e.g. a new surface), when the corresponding `scripts/fuzz/{surface}.js` + flow are committed, then the suite picks it up automatically on the next nightly run

