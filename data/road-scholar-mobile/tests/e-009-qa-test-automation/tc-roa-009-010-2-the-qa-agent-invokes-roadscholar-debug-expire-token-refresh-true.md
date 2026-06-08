---
id: TC-ROA-009-010-2
title: 'The QA agent invokes roadscholar://debug/expire-token?refresh=true'
category: e-009-qa-test-automation
scenario: Negative
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-009-010
  - e-009
created: '2026-06-05'
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-010
  ac_index: 1
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-010-token-backdate-harness.md
  source_checksum: 27d43ebd246d1cdc
---
## Steps
1. **Setup:** a Staging build
2. **Action:** the QA agent invokes `roadscholar://debug/expire-token?refresh=true`
3. **Assert:** both the access and refresh tokens are expired

## Expected Result
**TC-009-010-002** Given a Staging build, when the QA agent invokes `roadscholar://debug/expire-token?refresh=true`, then both the access and refresh tokens are expired

