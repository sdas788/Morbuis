---
id: TC-MOR-025-006-2
title: 'Given Direction Guardrail #5 in requirements/wiki/direction-2026-04.md'
category: e-025-morbius-v2-0-cloud-deploy-web-only-hosted
scenario: Detour
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-025-006
  - e-025
created: '2026-04-30'
updated: '2026-04-30'
pmagent_source:
  slug: morbius
  story_id: S-025-006
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-025-cloud-deploy/S-025-006-e022-gate-flip-direction-addendum.md
  source_checksum: bd02037143e727ad
---
## Steps
1. **Setup:** Direction Guardrail #5 in `requirements/wiki/direction-2026-04.md` says *"do NOT pull in Claude Agent SDK or OpenAI SDK until E-022 gate criteria are met"*
2. **Action:** I append a v1.1 addendum
3. **Assert:** the guardrail is reframed to: *"v2.1 cloud runner targets Anthropic Managed Agents; Claude Agent SDK is the documented fallback if Managed Agents doesn't fit the browser-MCP-locality constraint (see arch.md C6 / E-025 Constraints). CLI subprocess remains the local-laptop default."*

## Expected Result
Given Direction Guardrail #5 in `requirements/wiki/direction-2026-04.md` says *"do NOT pull in Claude Agent SDK or OpenAI SDK until E-022 gate criteria are met"* When I append a v1.1 addendum Then the guardrail is reframed to: *"v2.1 cloud runner targets Anthropic Managed Agents; Claude Agent SDK is the documented fallback if Managed Agents doesn't fit the browser-MCP-locality constraint (see arch.md C6 / E-025 Constraints). CLI subprocess remains the local-laptop default."*

