---
id: TC-ROA-009-015-1
title: 'Yarn test:e2e:tf-005 runs against an Android emulator'
category: e-009-qa-test-automation
scenario: Happy Path
status: not-run
priority: P4
platforms:
  - android
  - ios
tags:
  - s-009-015
  - e-009
created: '2026-06-05'
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-015
  ac_index: 0
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-015-implement-tf-005.md
  source_checksum: a9cd91c4e3ceae2d
---
## Steps
1. **Setup:** S-009-001 + S-009-002 are landed
2. **Action:** `yarn test:e2e:tf-005` runs against an Android emulator
3. **Assert:** both Journey A + B pass on first run

## Expected Result
**TC-009-015-001** Given S-009-001 + S-009-002 are landed, when `yarn test:e2e:tf-005` runs against an Android emulator, then both Journey A + B pass on first run

