---
id: TC-ROA-009-016-6
title: The app shows an empty state or clear error — no crash
category: e-009-qa-test-automation
scenario: Negative
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
  ac_index: 5
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-016-implement-tf-006-anomaly.md
  source_checksum: dd39e565dee40f06
---
## Steps
1. **Setup:** the curated cases AC-NET-001 + AC-NET-002 (null + empty backend body)
2. **Action:** the mocked-response flows run
3. **Assert:** the app shows an empty state or clear error — no crash

## Expected Result
**TC-009-016-006** Given the curated cases AC-NET-001 + AC-NET-002 (null + empty backend body), when the mocked-response flows run, then the app shows an empty state or clear error — no crash

