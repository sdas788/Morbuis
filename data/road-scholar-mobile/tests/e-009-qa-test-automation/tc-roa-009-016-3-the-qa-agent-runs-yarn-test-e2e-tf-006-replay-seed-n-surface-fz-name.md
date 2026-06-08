---
id: TC-ROA-009-016-3
title: 'The QA agent runs yarn test:e2e:tf-006:replay --seed=N --surface=FZ-NAME'
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P4
platforms:
  - android
  - ios
tags:
  - s-009-016
  - e-009
created: '2026-06-05'
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-016
  ac_index: 2
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-016-implement-tf-006-anomaly.md
  source_checksum: 0bc93ee205617eec
---
## Steps
1. **Setup:** a fuzz failure on a specific surface + seed
2. **Action:** the QA agent runs `yarn test:e2e:tf-006:replay --seed=N --surface=FZ-NAME`
3. **Assert:** the exact same input is regenerated and the failure is reproduced

## Expected Result
**TC-009-016-003** Given a fuzz failure on a specific surface + seed, when the QA agent runs `yarn test:e2e:tf-006:replay --seed=N --surface=FZ-NAME`, then the exact same input is regenerated and the failure is reproduced

