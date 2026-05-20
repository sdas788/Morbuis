---
id: TC-MOR-027-005-1
title: Given any code path calls askClaude() When the call completes (success
category: e-027-appmap-as-qa-storyteller
scenario: Negative
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-027-005
  - e-027
created: '2026-05-04'
updated: '2026-05-04'
pmagent_source:
  slug: morbius
  story_id: S-027-005
  ac_index: 0
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-027-appmap-storyteller/S-027-005-agent-activity-log.md
  source_checksum: 9f80260707e23c42
---
## Steps
1. **Setup:** any code path calls `askClaude()`
2. **Action:** the call completes (success or error)
3. **Assert:** a single JSON line is appended to `data/{projectId}/agent-activity.json` with `{at, kind, durationMs, projectId, ok}`

## Expected Result
Given any code path calls `askClaude()` When the call completes (success or error) Then a single JSON line is appended to `data/{projectId}/agent-activity.json` with `{at, kind, durationMs, projectId, ok}`

