---
id: TC-MOR-026-004-1
title: Given S-026-003 has been live as opt-in for ≥7 days with ≥20 real test
category: e-026-anthropic-managed-agents-migration-v2-1-runner
scenario: Negative
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
  ac_index: 0
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-026-managed-agents-migration/S-026-004-cutover-plan.md
  source_checksum: 25e8cecd8e7e85b6
---
## Steps
1. **Setup:** S-026-003 has been live as opt-in for ≥7 days with ≥20 real test runs in `managed-agents` mode
2. **Action:** I review the parity report (CLI vs. managed-agents pass/fail counts, latency p50/p95, cost per run)
3. **Assert:** the report shows: pass rate within 2 percentage points of CLI, p95 latency within 1.2× CLI, cost within 2× CLI baseline. If any of those fail, cutover is blocked — go back to S-026-003 and investigate.

## Expected Result
Given S-026-003 has been live as opt-in for ≥7 days with ≥20 real test runs in `managed-agents` mode When I review the parity report (CLI vs. managed-agents pass/fail counts, latency p50/p95, cost per run) Then the report shows: pass rate within 2 percentage points of CLI, p95 latency within 1.2× CLI, cost within 2× CLI baseline. If any of those fail, cutover is blocked — go back to S-026-003 and investigate.

