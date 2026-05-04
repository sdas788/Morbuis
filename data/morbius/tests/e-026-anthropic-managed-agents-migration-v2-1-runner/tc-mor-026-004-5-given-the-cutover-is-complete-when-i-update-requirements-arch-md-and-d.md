---
id: TC-MOR-026-004-5
title: Given the cutover is complete When I update requirements/arch.md and d
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
  ac_index: 4
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-026-managed-agents-migration/S-026-004-cutover-plan.md
  source_checksum: e16389f8dc8c17a1
---
## Steps
1. **Setup:** the cutover is complete
2. **Action:** I update `requirements/arch.md` and `docs/cloud-deploy.md`
3. **Assert:** Managed Agents is named as the production runner and CLI mode is documented as the escape hatch (with the env-var rollback procedure)

## Expected Result
Given the cutover is complete When I update `requirements/arch.md` and `docs/cloud-deploy.md` Then Managed Agents is named as the production runner and CLI mode is documented as the escape hatch (with the env-var rollback procedure)

