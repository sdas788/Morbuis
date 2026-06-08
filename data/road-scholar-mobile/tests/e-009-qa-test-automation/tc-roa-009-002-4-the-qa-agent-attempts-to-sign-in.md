---
id: TC-ROA-009-002-4
title: The QA agent attempts to sign in
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
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-002
  ac_index: 3
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-002-p0-test-accounts.md
  source_checksum: 1d9037b7e0f4f680
---
## Steps
1. **Setup:** `rs-test-banned-user`
2. **Action:** the QA agent attempts to sign in
3. **Assert:** the banned-user OAuth recovery path runs per TF-001 Journey D

## Expected Result
**TC-009-002-004** Given `rs-test-banned-user`, when the QA agent attempts to sign in, then the banned-user OAuth recovery path runs per TF-001 Journey D

