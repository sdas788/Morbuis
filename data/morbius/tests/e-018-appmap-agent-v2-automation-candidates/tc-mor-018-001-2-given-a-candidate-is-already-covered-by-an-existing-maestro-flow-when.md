---
id: TC-MOR-018-001-2
title: Given a candidate is already covered by an existing Maestro flow When
category: e-018-appmap-agent-v2-automation-candidates
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-018-001
  - e-018
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-018-001
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-018-appmap-agent-v2/S-018-001-automation-candidates-section.md
  source_checksum: 1d7265416f54a9ec
---
## Steps
1. **Setup:** a candidate is already covered by an existing Maestro flow
2. **Action:** the section renders
3. **Assert:** that candidate is visually deprioritized (strikethrough or gray) with a link to the existing flow

## Expected Result
Given a candidate is already covered by an existing Maestro flow When the section renders Then that candidate is visually deprioritized (strikethrough or gray) with a link to the existing flow

