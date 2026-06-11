---
id: TC-ROA-009-006-6
title: The platform-specific failure is clearly indicated — not aggregated into a ge…
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-009-006
  - e-009
created: '2026-06-05'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-006
  ac_index: 5
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-006-maestro-cloud-nightly.md
  source_checksum: a9f805ae0532e8c8
---
## Steps
1. **Setup:** a flow fails on iOS but passes on Android in the same nightly run
2. **Action:** the report is produced
3. **Assert:** the platform-specific failure is clearly indicated — not aggregated into a generic "flow X failed" message

## Expected Result
**TC-009-006-006** Given a flow fails on iOS but passes on Android in the same nightly run, when the report is produced, then the platform-specific failure is clearly indicated — not aggregated into a generic "flow X failed" message

