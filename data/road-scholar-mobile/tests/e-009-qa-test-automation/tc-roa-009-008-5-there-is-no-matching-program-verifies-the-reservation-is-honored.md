---
id: TC-ROA-009-008-5
title: There is no matching program (verifies the reservation is honored)
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-009-008
  - e-009
created: '2026-06-05'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-008
  ac_index: 4
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-008-backend-fixtures-push-hook.md
  source_checksum: 13d44932aae92a4b
---
## Steps
1. **Setup:** program `99999` is queried in TF-004 Journey B
2. **Action:** the search returns
3. **Assert:** there is no matching program (verifies the reservation is honored)

## Expected Result
**TC-009-008-005** Given program `99999` is queried in TF-004 Journey B, when the search returns, then there is no matching program (verifies the reservation is honored)

