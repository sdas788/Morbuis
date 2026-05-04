---
id: TC-MOR-026-004-2
title: Given the parity report passes When I flip MORBIUSAGENTMODE Fly secret
category: e-026-anthropic-managed-agents-migration-v2-1-runner
scenario: Detour
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
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-026-managed-agents-migration/S-026-004-cutover-plan.md
  source_checksum: b61e43f716df39d9
---
## Steps
1. **Setup:** the parity report passes
2. **Action:** I flip `MORBIUS_AGENT_MODE` Fly secret from `cli-subprocess` to `managed-agents`
3. **Assert:** the next deploy makes Managed Agents the default; the CLI subprocess still works (image still has the CLI baked in) but is only used when the env var is explicitly set back

## Expected Result
Given the parity report passes When I flip `MORBIUS_AGENT_MODE` Fly secret from `cli-subprocess` to `managed-agents` Then the next deploy makes Managed Agents the default; the CLI subprocess still works (image still has the CLI baked in) but is only used when the env var is explicitly set back

