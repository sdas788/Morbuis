---
id: TC-MOR-020-001-3
title: Given only partial inputs are provided When I proceed Then the flow de
category: e-020-legacy-app-coverage-scan-gated
scenario: Negative
status: not-run
priority: P4
platforms:
  - android
  - ios
tags:
  - s-020-001
  - e-020
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-020-001
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-020-legacy-app-coverage-scan/S-020-001-legacy-upload-onboarding.md
  source_checksum: 053c6d3666d9c3e6
---
## Steps
1. **Setup:** only partial inputs are provided
2. **Action:** I proceed
3. **Assert:** the flow degrades gracefully (no Excel → gap report marks "no existing tests"; no app binary → error) ---

## Expected Result
Given only partial inputs are provided When I proceed Then the flow degrades gracefully (no Excel → gap report marks "no existing tests"; no app binary → error) ---

