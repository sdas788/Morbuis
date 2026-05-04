---
id: TC-MOR-016-005-2
title: Given the impact analysis has a risk score When rendered Then the scor
category: e-016-bug-impact-ai-ticket-repro
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-016-005
  - e-016
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-016-005
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-016-bug-impact-ai/S-016-005-related-tests-rationale.md
  source_checksum: 3cb54be5c7b32bcf
---
## Steps
1. **Setup:** the impact analysis has a risk score
2. **Action:** rendered
3. **Assert:** the score (0.0–1.0) is displayed with a color-coded band (green <0.3, yellow 0.3–0.7, red >0.7) and a prose summary

## Expected Result
Given the impact analysis has a risk score When rendered Then the score (0.0–1.0) is displayed with a color-coded band (green <0.3, yellow 0.3–0.7, red >0.7) and a prose summary

