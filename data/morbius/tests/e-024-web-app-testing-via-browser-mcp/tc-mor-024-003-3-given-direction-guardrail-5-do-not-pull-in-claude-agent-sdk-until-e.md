---
id: TC-MOR-024-003-3
title: 'Given Direction Guardrail #5 ("do NOT pull in Claude Agent SDK until E'
category: e-024-web-app-testing-via-browser-mcp
scenario: Detour
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-024-003
  - e-024
created: '2026-04-29'
updated: '2026-04-29'
pmagent_source:
  slug: morbius
  story_id: S-024-003
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-024-web-app-testing/S-024-003-run-agent-task-chokepoint.md
  source_checksum: 144671e0ad748d54
---
## Steps
1. **Setup:** Direction Guardrail #5 ("do NOT pull in Claude Agent SDK until E-022 gate criteria are met")
2. **Action:** v1 ships
3. **Assert:** no `@anthropic-ai/claude-agent-sdk` dependency is added to `package.json` and the chokepoint is documented as the single swap point ---

## Expected Result
Given Direction Guardrail #5 ("do NOT pull in Claude Agent SDK until E-022 gate criteria are met") When v1 ships Then no `@anthropic-ai/claude-agent-sdk` dependency is added to `package.json` and the chokepoint is documented as the single swap point ---

