---
id: TC-MOR-016-002-2
title: 'Given the Claude call fails (timeout, invalid response) When the failu'
category: e-016-bug-impact-ai-ticket-repro
scenario: Negative
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
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-016-bug-impact-ai/S-016-002-claude-impact-agent.md
  source_checksum: d2382a731caa1ac9
---
## Steps
1. **Setup:** the Claude call fails (timeout, invalid response)
2. **Action:** the failure occurs
3. **Assert:** the previous impact file (if any) is preserved and the error is logged; the UI shows a "generation failed, retry" state

## Expected Result
Given the Claude call fails (timeout, invalid response) When the failure occurs Then the previous impact file (if any) is preserved and the error is logged; the UI shows a "generation failed, retry" state

