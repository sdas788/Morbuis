---
id: TC-MOR-027-003-3
title: Given a flow with zero runs When rendered Then lastRunsSummary says "N
category: e-027-appmap-as-qa-storyteller
scenario: Negative
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
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-027-appmap-storyteller/S-027-003-per-flow-rationale.md
  source_checksum: def5536c9aedefbc
---
## Steps
1. **Setup:** a flow with zero runs
2. **Action:** rendered
3. **Assert:** `lastRunsSummary` says "No runs yet" verbatim (so the UI can render an explicit empty state)

## Expected Result
Given a flow with zero runs When rendered Then `lastRunsSummary` says "No runs yet" verbatim (so the UI can render an explicit empty state)

