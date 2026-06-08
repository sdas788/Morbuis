---
id: TC-ROA-009-001-4
title: Control returns to the calling flow
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
  ac_index: 3
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-001-maestro-scaffolding.md
  source_checksum: b5f44aff4da07c5b
---
## Steps
1. **Setup:** the setup flow `login-and-reach-home.yaml` is invoked via `runFlow` from a separate flow
2. **Action:** control returns to the calling flow
3. **Assert:** the device is on Home with the test account authenticated — no leaked modal, no half-state

## Expected Result
**TC-009-001-004** Given the setup flow `login-and-reach-home.yaml` is invoked via `runFlow` from a separate flow, when control returns to the calling flow, then the device is on Home with the test account authenticated — no leaked modal, no half-state

