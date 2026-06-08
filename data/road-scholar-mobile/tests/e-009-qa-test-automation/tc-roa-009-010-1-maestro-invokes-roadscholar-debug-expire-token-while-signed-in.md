---
id: TC-ROA-009-010-1
title: 'Maestro invokes roadscholar://debug/expire-token while signed in'
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
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-010
  ac_index: 0
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-010-token-backdate-harness.md
  source_checksum: ca15c5c7cf14ccb5
---
## Steps
1. **Setup:** a Dev build with the harness compiled in
2. **Action:** Maestro invokes `roadscholar://debug/expire-token` while signed in
3. **Assert:** the persisted access token is mutated to an expired value within 1 second

## Expected Result
**TC-009-010-001** Given a Dev build with the harness compiled in, when Maestro invokes `roadscholar://debug/expire-token` while signed in, then the persisted access token is mutated to an expired value within 1 second

