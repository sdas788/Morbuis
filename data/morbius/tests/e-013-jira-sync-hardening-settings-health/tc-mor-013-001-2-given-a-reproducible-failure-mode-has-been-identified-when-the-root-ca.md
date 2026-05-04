---
id: TC-MOR-013-001-2
title: Given a reproducible failure mode has been identified When the root ca
category: e-013-jira-sync-hardening-settings-health
scenario: Detour
status: flaky
priority: P1
platforms:
  - android
  - ios
tags:
  - s-013-001
  - e-013
created: '2026-04-28'
updated: '2026-04-29'
pmagent_source:
  slug: morbius
  story_id: S-013-001
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-013-jira-sync-hardening/S-013-001-audit-fix-sync-failure-modes.md
  source_checksum: 4bce11fa77b7d2f9
---
## Steps
1. **Setup:** a reproducible failure mode has been identified
2. **Action:** the root cause fix is deployed
3. **Assert:** a 7-day canary run shows >99% sync success rate with no silent data loss

## Expected Result
Given a reproducible failure mode has been identified When the root cause fix is deployed Then a 7-day canary run shows >99% sync success rate with no silent data loss

## Changelog
| Timestamp | Field | Old Value | New Value | Actor |
|-----------|-------|-----------|-----------|-------|
| 2026-04-29T20:24:52.735Z | status | not-run | in-progress | web-headless-run |
| 2026-04-29T20:26:12.503Z | status | in-progress | flaky | web-headless-run |

