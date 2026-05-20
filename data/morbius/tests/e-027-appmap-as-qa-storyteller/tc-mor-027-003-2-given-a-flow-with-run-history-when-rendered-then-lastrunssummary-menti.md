---
id: TC-MOR-027-003-2
title: Given a flow with run history When rendered Then lastRunsSummary menti
category: e-027-appmap-as-qa-storyteller
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-027-003
  - e-027
created: '2026-05-04'
updated: '2026-05-04'
pmagent_source:
  slug: morbius
  story_id: S-027-003
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-027-appmap-storyteller/S-027-003-per-flow-rationale.md
  source_checksum: 0ba4233691384eff
---
## Steps
1. **Setup:** a flow with run history
2. **Action:** rendered
3. **Assert:** `lastRunsSummary` mentions at least one concrete observation (specific failing step, retry pattern, device, or pass-rate trend) — not boilerplate

## Expected Result
Given a flow with run history When rendered Then `lastRunsSummary` mentions at least one concrete observation (specific failing step, retry pattern, device, or pass-rate trend) — not boilerplate

