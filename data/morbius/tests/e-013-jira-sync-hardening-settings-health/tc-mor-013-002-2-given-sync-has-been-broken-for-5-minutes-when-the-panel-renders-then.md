---
id: TC-MOR-013-002-2
title: Given sync has been broken for >5 minutes When the panel renders Then
category: e-013-jira-sync-hardening-settings-health
scenario: Detour
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-013-002
  - e-013
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-013-002
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-013-jira-sync-hardening/S-013-002-settings-health-panel.md
  source_checksum: bf0a106c1a95f362
---
## Steps
1. **Setup:** sync has been broken for >5 minutes
2. **Action:** the panel renders
3. **Assert:** a red status indicator and suggested remediation action are visible

## Expected Result
Given sync has been broken for >5 minutes When the panel renders Then a red status indicator and suggested remediation action are visible

