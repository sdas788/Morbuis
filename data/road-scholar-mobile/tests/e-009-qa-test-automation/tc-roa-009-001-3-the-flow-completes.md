---
id: TC-ROA-009-001-3
title: The flow completes
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-009-001
  - e-009
created: '2026-06-05'
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-001
  ac_index: 2
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-001-maestro-scaffolding.md
  source_checksum: efddc1b7916f5870
---
## Steps
1. **Setup:** the smoke flow runs against a local sim with `rs-test-returning-participant` provisioned
2. **Action:** the flow completes
3. **Assert:** Home is asserted and an evidence screenshot exists at `evidence/smoke-home-renders/01-home.png`

## Expected Result
**TC-009-001-003** Given the smoke flow runs against a local sim with `rs-test-returning-participant` provisioned, when the flow completes, then Home is asserted and an evidence screenshot exists at `evidence/smoke-home-renders/01-home.png`

