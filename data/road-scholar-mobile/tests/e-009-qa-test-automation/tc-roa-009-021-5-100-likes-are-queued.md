---
id: TC-ROA-009-021-5
title: 100+ likes are queued
category: e-009-qa-test-automation
scenario: Edge Case
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-009-021
  - e-009
created: '2026-06-05'
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-021
  ac_index: 4
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-021-tf-005-alt-branch-coverage.md
  source_checksum: c876fe43fc7be91f
---
## Steps
1. **Setup:** the queue-overflow alt
2. **Action:** 100+ likes are queued
3. **Assert:** the drain order matches the queue order on reconnect (FIFO) and no likes are lost

## Expected Result
**TC-009-021-005** Given the queue-overflow alt, when 100+ likes are queued, then the drain order matches the queue order on reconnect (FIFO) and no likes are lost

