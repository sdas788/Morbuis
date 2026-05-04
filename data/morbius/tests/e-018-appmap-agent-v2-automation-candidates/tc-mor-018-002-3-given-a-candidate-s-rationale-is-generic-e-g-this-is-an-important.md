---
id: TC-MOR-018-002-3
title: 'Given a candidate''s rationale is generic (e.g., "This is an important'
category: e-018-appmap-agent-v2-automation-candidates
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-018-002
  - e-018
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-018-002
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-018-appmap-agent-v2/S-018-002-priority-rationale-generation.md
  source_checksum: 0bcc5af2b5d037b2
---
## Steps
1. **Setup:** a candidate's rationale is generic (e.g., "This is an important flow")
2. **Action:** the output is validated
3. **Assert:** a lint check rejects generic rationales and re-prompts for specificity — stored in `data/{projectId}/automation-candidates.md` only when quality threshold passes ---

## Expected Result
Given a candidate's rationale is generic (e.g., "This is an important flow") When the output is validated Then a lint check rejects generic rationales and re-prompts for specificity — stored in `data/{projectId}/automation-candidates.md` only when quality threshold passes ---

