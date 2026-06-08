---
id: TC-ROA-009-009-1
title: 'Yarn test:e2e:tf-002 runs against Android emulator'
category: e-009-qa-test-automation
scenario: Happy Path
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-009-009
  - e-009
created: '2026-06-05'
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-009
  ac_index: 0
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-009-implement-tf-002.md
  source_checksum: 402ffa049f2ce8c3
---
## Steps
1. **Setup:** a clean RC build and all 10 accounts at baseline + RS-TEST-GROUP-A seeded
2. **Action:** `yarn test:e2e:tf-002` runs against Android emulator
3. **Assert:** all 3 happy-path journeys pass on first run

## Expected Result
**TC-009-009-001** Given a clean RC build and all 10 accounts at baseline + RS-TEST-GROUP-A seeded, when `yarn test:e2e:tf-002` runs against Android emulator, then all 3 happy-path journeys pass on first run

