---
id: TC-ROA-009-004-4
title: 'The new file is picked up automatically by yarn test:e2e:all without changing…'
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-009-004
  - e-009
created: '2026-06-05'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-004
  ac_index: 3
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-004-bitrise-pr-trigger.md
  source_checksum: 5aff66700fd87ceb
---
## Steps
1. **Setup:** a PR adds a new TF-NNN flow file under `maestro/flows/`
2. **Action:** the next PR run executes
3. **Assert:** the new file is picked up automatically by `yarn test:e2e:all` without changing the Bitrise workflow YAML

## Expected Result
**TC-009-004-004** Given a PR adds a new TF-NNN flow file under `maestro/flows/`, when the next PR run executes, then the new file is picked up automatically by `yarn test:e2e:all` without changing the Bitrise workflow YAML

