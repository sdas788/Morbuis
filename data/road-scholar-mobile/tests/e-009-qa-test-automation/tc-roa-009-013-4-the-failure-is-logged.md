---
id: TC-ROA-009-013-4
title: The failure is logged
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-009-013
  - e-009
created: '2026-06-05'
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-013
  ac_index: 3
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-013-tf-teardown-automation.md
  source_checksum: 603279ad230f79d1
---
## Steps
1. **Setup:** a teardown step fails (backend cleanup endpoint 500s)
2. **Action:** the failure is logged
3. **Assert:** the failure is appended to the Run Log notes with a clear "teardown-failed-cleanup-may-be-stale" prefix — the run itself is still marked passed (assuming the flows passed)

## Expected Result
**TC-009-013-004** Given a teardown step fails (backend cleanup endpoint 500s), when the failure is logged, then the failure is appended to the Run Log notes with a clear "teardown-failed-cleanup-may-be-stale" prefix — the run itself is still marked passed (assuming the flows passed)

