---
id: TC-MOR-026-003-1
title: Given S-026-001 (API spike) and S-026-002 (architecture decision) are
category: e-026-anthropic-managed-agents-migration-v2-1-runner
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-026-003
  - e-026
created: '2026-04-30'
updated: '2026-04-30'
pmagent_source:
  slug: morbius
  story_id: S-026-003
  ac_index: 0
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-026-managed-agents-migration/S-026-003-implement-managed-agents-mode.md
  source_checksum: fd2124c45991cf3c
---
## Steps
1. **Setup:** S-026-001 (API spike) and S-026-002 (architecture decision) are both done
2. **Action:** I implement the `managed-agents` mode in `src/runners/web-agent.ts`
3. **Assert:** `runAgentTask({mode:'managed-agents', prompt, mcps, allowedTools, timeoutMs})` returns a `AgentResult` with the same shape as CLI mode — same screenshots, same step log, same pass/fail signal — so the dashboard UI doesn't care which runner produced the result

## Expected Result
Given S-026-001 (API spike) and S-026-002 (architecture decision) are both done When I implement the `managed-agents` mode in `src/runners/web-agent.ts` Then `runAgentTask({mode:'managed-agents', prompt, mcps, allowedTools, timeoutMs})` returns a `AgentResult` with the same shape as CLI mode — same screenshots, same step log, same pass/fail signal — so the dashboard UI doesn't care which runner produced the result

