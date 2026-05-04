---
id: TC-MOR-024-006-2
title: Given the section names the swap point When future-me searches arch.md
category: e-024-web-app-testing-via-browser-mcp
scenario: Detour
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-024-006
  - e-024
created: '2026-04-29'
updated: '2026-04-29'
pmagent_source:
  slug: morbius
  story_id: S-024-006
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-024-web-app-testing/S-024-006-production-path-arch-doc.md
  source_checksum: 223e281521ac7468
---
## Steps
1. **Setup:** the section names the swap point
2. **Action:** future-me searches arch.md for "Production Deployment" or "Agent SDK"
3. **Assert:** they find a pointer to `src/runners/web-agent.ts` → `runAgentTask()` and a one-line summary of what's commented-stub vs. live

## Expected Result
Given the section names the swap point When future-me searches arch.md for "Production Deployment" or "Agent SDK" Then they find a pointer to `src/runners/web-agent.ts` → `runAgentTask()` and a one-line summary of what's commented-stub vs. live

