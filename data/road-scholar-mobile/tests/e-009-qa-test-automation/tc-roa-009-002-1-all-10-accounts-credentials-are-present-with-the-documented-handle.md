---
id: TC-ROA-009-002-1
title: All 10 accounts' credentials are present with the documented handle
category: e-009-qa-test-automation
scenario: Happy Path
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
  ac_index: 0
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-002-p0-test-accounts.md
  source_checksum: a232679cafc1baa6
---
## Steps
1. **Setup:** the 1Password shared vault
2. **Action:** an engineer with QA-agent permissions opens it
3. **Assert:** all 10 accounts' credentials are present with the documented handle

## Expected Result
**TC-009-002-001** Given the 1Password shared vault, when an engineer with QA-agent permissions opens it, then all 10 accounts' credentials are present with the documented handle

