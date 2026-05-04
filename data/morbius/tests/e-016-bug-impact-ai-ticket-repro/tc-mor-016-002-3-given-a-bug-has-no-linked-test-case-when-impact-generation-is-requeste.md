---
id: TC-MOR-016-002-3
title: Given a bug has no linked test case When impact generation is requeste
category: e-016-bug-impact-ai-ticket-repro
scenario: Detour
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-016-002
  - e-016
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-016-002
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-016-bug-impact-ai/S-016-002-claude-impact-agent.md
  source_checksum: 982732e1f49ec261
---
## Steps
1. **Setup:** a bug has no linked test case
2. **Action:** impact generation is requested
3. **Assert:** the agent degrades gracefully — produces Repro Narrative only, flags "limited context" in the frontmatter ---

## Expected Result
Given a bug has no linked test case When impact generation is requested Then the agent degrades gracefully — produces Repro Narrative only, flags "limited context" in the frontmatter ---

