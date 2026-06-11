---
id: TC-ROA-009-010-4
title: The app silently refreshes via the refresh token (the documented S-005-001 /…
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
  ac_index: 3
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-010-token-backdate-harness.md
  source_checksum: a42dfe8dd383f634
---
## Steps
1. **Setup:** the harness has expired only the access token
2. **Action:** the next authenticated API call fires
3. **Assert:** the app silently refreshes via the refresh token (the documented S-005-001 / S-007-004 path) — the harness exercises the natural recovery, not a synthetic one

## Expected Result
**TC-009-010-004** Given the harness has expired only the access token, when the next authenticated API call fires, then the app silently refreshes via the refresh token (the documented S-005-001 / S-007-004 path) — the harness exercises the natural recovery, not a synthetic one

