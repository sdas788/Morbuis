---
id: TC-MOR-017-001-2
title: Given a selector miss is detected When the runner finishes Then a Heal
category: e-017-self-healing-selectors
scenario: Detour
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-017-001
  - e-017
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-017-001
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-017-self-healing-selectors/S-017-001-failure-interception-hook.md
  source_checksum: 26584b1befcf13b1
---
## Steps
1. **Setup:** a selector miss is detected
2. **Action:** the runner finishes
3. **Assert:** a `HealingRequest` record is created with: flow path, failed selector, failure line number, runId

## Expected Result
Given a selector miss is detected When the runner finishes Then a `HealingRequest` record is created with: flow path, failed selector, failure line number, runId

