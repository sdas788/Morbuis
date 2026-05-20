---
id: TC-MOR-027-002-1
title: Given the active project is micro-air When the client calls POST /api/
category: e-027-appmap-as-qa-storyteller
scenario: Happy Path
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-027-002
  - e-027
created: '2026-05-04'
updated: '2026-05-04'
pmagent_source:
  slug: morbius
  story_id: S-027-002
  ac_index: 0
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-027-appmap-storyteller/S-027-002-generation-pipeline.md
  source_checksum: d9268e8646008e5f
---
## Steps
1. **Setup:** the active project is `micro-air`
2. **Action:** the client calls `POST /api/appmap/narrative/generate`
3. **Assert:** the response is `{ ok: true, narrative, durationMs }` within ~10 seconds (Claude budget 180s but typical 4–8s)

## Expected Result
Given the active project is `micro-air` When the client calls `POST /api/appmap/narrative/generate` Then the response is `{ ok: true, narrative, durationMs }` within ~10 seconds (Claude budget 180s but typical 4–8s)

