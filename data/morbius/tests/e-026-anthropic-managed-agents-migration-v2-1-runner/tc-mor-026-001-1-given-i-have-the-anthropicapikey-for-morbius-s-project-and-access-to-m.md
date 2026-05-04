---
id: TC-MOR-026-001-1
title: Given I have the ANTHROPICAPIKEY for Morbius's project and access to M
category: e-026-anthropic-managed-agents-migration-v2-1-runner
scenario: Happy Path
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-026-001
  - e-026
created: '2026-04-30'
updated: '2026-04-30'
pmagent_source:
  slug: morbius
  story_id: S-026-001
  ac_index: 0
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-026-managed-agents-migration/S-026-001-managed-agents-api-spike.md
  source_checksum: db6c50de96b6bb8f
---
## Steps
1. **Setup:** I have the `ANTHROPIC_API_KEY` for Morbius's project and access to Managed Agents API documentation
2. **Action:** I run `tsx scripts/spike/managed-agents-noop.ts`
3. **Assert:** the script POSTs a "say hello" task with no MCPs attached, polls (or webhooks) for completion, and prints the final result text — proving auth + request shape + completion signaling all work end-to-end

## Expected Result
Given I have the `ANTHROPIC_API_KEY` for Morbius's project and access to Managed Agents API documentation When I run `tsx scripts/spike/managed-agents-noop.ts` Then the script POSTs a "say hello" task with no MCPs attached, polls (or webhooks) for completion, and prints the final result text — proving auth + request shape + completion signaling all work end-to-end

