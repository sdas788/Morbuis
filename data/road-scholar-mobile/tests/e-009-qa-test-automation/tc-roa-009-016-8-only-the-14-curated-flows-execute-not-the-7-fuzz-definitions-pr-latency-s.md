---
id: TC-ROA-009-016-8
title: Only the 14 curated flows execute (not the 7 fuzz definitions) — PR latency s…
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P4
platforms:
  - android
  - ios
tags:
  - s-009-016
  - e-009
created: '2026-06-05'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-016
  ac_index: 7
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-016-implement-tf-006-anomaly.md
  source_checksum: 230296607e78219b
---
## Steps
1. **Setup:** the curated subset runs on PR-E2E (via S-009-004)
2. **Action:** a PR is opened
3. **Assert:** only the 14 curated flows execute (not the 7 fuzz definitions) — PR latency stays bounded

## Expected Result
**TC-009-016-008** Given the curated subset runs on PR-E2E (via S-009-004), when a PR is opened, then only the 14 curated flows execute (not the 7 fuzz definitions) — PR latency stays bounded

