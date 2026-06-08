---
id: TC-ROA-009-006-5
title: 80% is consumed
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
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-006
  ac_index: 4
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-006-maestro-cloud-nightly.md
  source_checksum: a885db7118df6575
---
## Steps
1. **Setup:** Maestro Cloud usage charges (separate from the fixed slot fees) approach the configured monthly threshold
2. **Action:** 80% is consumed
3. **Assert:** the budget alert fires to the PM + dev lead with a recommendation (drop a device, throttle cadence, etc.). Slot fees themselves are fixed at ~$500/mo for 2 devices and not subject to a budget alert — they're a flat operational cost.

## Expected Result
**TC-009-006-005** Given Maestro Cloud usage charges (separate from the fixed slot fees) approach the configured monthly threshold, when 80% is consumed, then the budget alert fires to the PM + dev lead with a recommendation (drop a device, throttle cadence, etc.). Slot fees themselves are fixed at ~$500/mo for 2 devices and not subject to a budget alert — they're a flat operational cost.

