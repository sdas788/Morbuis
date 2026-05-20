---
id: TC-MOR-027-001-1
title: Given a project with no narrative yet When the client calls GET /api/a
category: e-027-appmap-as-qa-storyteller
scenario: Happy Path
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-027-001
  - e-027
created: '2026-05-04'
updated: '2026-05-04'
pmagent_source:
  slug: morbius
  story_id: S-027-001
  ac_index: 0
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-027-appmap-storyteller/S-027-001-narrative-data-model.md
  source_checksum: 0ab28b09ef39fd38
---
## Steps
1. **Setup:** a project with no narrative yet
2. **Action:** the client calls `GET /api/appmap/narrative`
3. **Assert:** it returns `{ narrative: null }` with HTTP 200

## Expected Result
Given a project with no narrative yet When the client calls `GET /api/appmap/narrative` Then it returns `{ narrative: null }` with HTTP 200

