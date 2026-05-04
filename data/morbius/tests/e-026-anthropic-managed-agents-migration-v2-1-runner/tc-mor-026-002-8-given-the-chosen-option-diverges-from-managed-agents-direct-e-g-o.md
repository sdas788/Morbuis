---
id: TC-MOR-026-002-8
title: 'Given the chosen option diverges from "Managed Agents direct" (e.g., o'
category: e-026-anthropic-managed-agents-migration-v2-1-runner
scenario: Detour
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-026-002
  - e-026
created: '2026-04-30'
updated: '2026-04-30'
pmagent_source:
  slug: morbius
  story_id: S-026-002
  ac_index: 7
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-026-managed-agents-migration/S-026-002-browser-locality-decision.md
  source_checksum: 8fa31bbdc0f7451e
---
## Steps
1. **Setup:** the chosen option diverges from "Managed Agents direct" (e.g., option (c) is hybrid)
2. **Action:** Direction Guardrail #5 (v1.1 from S-025-006) names Managed Agents as the v2.1 target
3. **Assert:** I update the direction doc with a v1.2 addendum naming the actual chosen architecture, so future-you reads what shipped, not what was planned

## Expected Result
Given the chosen option diverges from "Managed Agents direct" (e.g., option (c) is hybrid) When Direction Guardrail #5 (v1.1 from S-025-006) names Managed Agents as the v2.1 target Then I update the direction doc with a v1.2 addendum naming the actual chosen architecture, so future-you reads what shipped, not what was planned

