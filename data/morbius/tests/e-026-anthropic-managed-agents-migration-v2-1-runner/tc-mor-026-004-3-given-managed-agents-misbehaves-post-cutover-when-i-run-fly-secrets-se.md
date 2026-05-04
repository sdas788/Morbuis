---
id: TC-MOR-026-004-3
title: Given Managed Agents misbehaves post-cutover When I run fly secrets se
category: e-026-anthropic-managed-agents-migration-v2-1-runner
scenario: Edge Case
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-026-004
  - e-026
created: '2026-04-30'
updated: '2026-04-30'
pmagent_source:
  slug: morbius
  story_id: S-026-004
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-026-managed-agents-migration/S-026-004-cutover-plan.md
  source_checksum: 1297efdbadb5ea3e
---
## Steps
1. **Setup:** Managed Agents misbehaves post-cutover
2. **Action:** I run `fly secrets set MORBIUS_AGENT_MODE=cli-subprocess && fly deploy`
3. **Assert:** production reverts to CLI mode within one deploy cycle (~3 min) without code changes

## Expected Result
Given Managed Agents misbehaves post-cutover When I run `fly secrets set MORBIUS_AGENT_MODE=cli-subprocess && fly deploy` Then production reverts to CLI mode within one deploy cycle (~3 min) without code changes

