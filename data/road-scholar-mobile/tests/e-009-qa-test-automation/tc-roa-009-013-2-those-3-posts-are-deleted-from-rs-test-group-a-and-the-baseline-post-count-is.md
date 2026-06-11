---
id: TC-ROA-009-013-2
title: Those 3 posts are deleted from RS-TEST-GROUP-A and the baseline post count is…
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-009-013
  - e-009
created: '2026-06-05'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-013
  ac_index: 1
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-013-tf-teardown-automation.md
  source_checksum: 0741ec7187a677ac
---
## Steps
1. **Setup:** TF-002 created 3 posts during a run tagged with the run-ID
2. **Action:** teardown invokes the backend cleanup endpoint
3. **Assert:** those 3 posts are deleted from `RS-TEST-GROUP-A` and the baseline post count is restored

## Expected Result
**TC-009-013-002** Given TF-002 created 3 posts during a run tagged with the run-ID, when teardown invokes the backend cleanup endpoint, then those 3 posts are deleted from `RS-TEST-GROUP-A` and the baseline post count is restored

