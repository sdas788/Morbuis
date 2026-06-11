---
id: TC-ROA-009-008-1
title: It returns the expected baseline (members + ≥3 posts from rs-test-second-part…
category: e-009-qa-test-automation
scenario: Happy Path
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
  ac_index: 0
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-008-backend-fixtures-push-hook.md
  source_checksum: 124e39c462d8e48d
---
## Steps
1. **Setup:** `RS-TEST-GROUP-A` is seeded
2. **Action:** the QA agent calls Verint's groups API with the group ID
3. **Assert:** it returns the expected baseline (members + ≥3 posts from `rs-test-second-participant` + a recent post date in the last 7 days)

## Expected Result
**TC-009-008-001** Given `RS-TEST-GROUP-A` is seeded, when the QA agent calls Verint's groups API with the group ID, then it returns the expected baseline (members + ≥3 posts from `rs-test-second-participant` + a recent post date in the last 7 days)

