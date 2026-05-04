---
id: TC-MOR-016-001-3
title: Given the BugImpact TypeScript type is added to src/types.ts When the
category: e-016-bug-impact-ai-ticket-repro
scenario: Detour
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-016-001
  - e-016
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-016-001
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-016-bug-impact-ai/S-016-001-impact-data-model.md
  source_checksum: 058bf809570293ae
---
## Steps
1. **Setup:** the `BugImpact` TypeScript type is added to `src/types.ts`
2. **Action:** the type is referenced from server.ts or parsers
3. **Assert:** compile passes and the type matches the markdown schema ---

## Expected Result
Given the `BugImpact` TypeScript type is added to `src/types.ts` When the type is referenced from server.ts or parsers Then compile passes and the type matches the markdown schema ---

