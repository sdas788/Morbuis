---
id: TC-ROA-009-013-1
title: 'The device is signed out, biometric is unenrolled, and rs-test-fresh-particip…'
category: e-009-qa-test-automation
scenario: Happy Path
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-009-013
  - e-009
created: '2026-06-05'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-013
  ac_index: 0
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-013-tf-teardown-automation.md
  source_checksum: 68e01de30d9bccfd
---
## Steps
1. **Setup:** TF-001 finishes
2. **Action:** the post-flow teardown runs
3. **Assert:** the device is signed out, biometric is unenrolled, and `rs-test-fresh-participant` shows "never signed in on this device" on the next run (manual or auto)

## Expected Result
**TC-009-013-001** Given TF-001 finishes, when the post-flow teardown runs, then the device is signed out, biometric is unenrolled, and `rs-test-fresh-participant` shows "never signed in on this device" on the next run (manual or auto)

