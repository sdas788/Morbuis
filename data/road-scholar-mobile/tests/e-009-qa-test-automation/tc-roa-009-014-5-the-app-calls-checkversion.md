---
id: TC-ROA-009-014-5
title: The app calls checkVersion()
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P4
platforms:
  - android
  - ios
tags:
  - s-009-014
  - e-009
created: '2026-06-05'
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-014
  ac_index: 4
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-014-ios-airplane-version-url.md
  source_checksum: 6caeac675ed5e7a5
---
## Steps
1. **Setup:** the publisher serves the malformed variant
2. **Action:** the app calls `checkVersion()`
3. **Assert:** the app fails open (no Alert shown, app proceeds) — verifies S-007-004's TC-007-004-005

## Expected Result
**TC-009-014-005** Given the publisher serves the malformed variant, when the app calls `checkVersion()`, then the app fails open (no Alert shown, app proceeds) — verifies S-007-004's TC-007-004-005

