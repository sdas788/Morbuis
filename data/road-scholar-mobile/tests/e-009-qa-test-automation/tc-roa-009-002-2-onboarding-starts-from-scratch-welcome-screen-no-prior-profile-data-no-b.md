---
id: TC-ROA-009-002-2
title: 'Onboarding starts from scratch (Welcome screen) — no prior profile data, no b…'
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-009-002
  - e-009
created: '2026-06-05'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-002
  ac_index: 1
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-002-p0-test-accounts.md
  source_checksum: 7b3ac17684e98459
---
## Steps
1. **Setup:** `rs-test-fresh-participant`
2. **Action:** the QA agent signs in on a clean app install
3. **Assert:** onboarding starts from scratch (Welcome screen) — no prior profile data, no biometric enrolled, no joined groups

## Expected Result
**TC-009-002-002** Given `rs-test-fresh-participant`, when the QA agent signs in on a clean app install, then onboarding starts from scratch (Welcome screen) — no prior profile data, no biometric enrolled, no joined groups

