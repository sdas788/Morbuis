---
id: TC-ROA-009-010-5
title: 'It passes consistently (no flake, since expiration is now deterministic, not…'
category: e-009-qa-test-automation
scenario: Negative
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-009-010
  - e-009
created: '2026-06-05'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-010
  ac_index: 4
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-010-token-backdate-harness.md
  source_checksum: a7066506e1935e96
---
## Steps
1. **Setup:** TF-001 Journey C alt-branch's "expired token refresh" is updated to use this harness
2. **Action:** the alt-branch runs end-to-end
3. **Assert:** it passes consistently (no flake, since expiration is now deterministic, not time-based)

## Expected Result
**TC-009-010-005** Given TF-001 Journey C alt-branch's "expired token refresh" is updated to use this harness, when the alt-branch runs end-to-end, then it passes consistently (no flake, since expiration is now deterministic, not time-based)

