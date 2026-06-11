---
id: TC-ROA-009-008-2
title: The device receives the push within 30 seconds and the payload data fields ar…
category: e-009-qa-test-automation
scenario: Edge Case
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-009-008
  - e-009
created: '2026-06-05'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-008
  ac_index: 1
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-008-backend-fixtures-push-hook.md
  source_checksum: 7be141d16f10d834
---
## Steps
1. **Setup:** a valid bearer token + a known device token
2. **Action:** the QA agent calls `POST /test/inject-push` with a valid payload
3. **Assert:** the device receives the push within 30 seconds and the payload data fields are exactly what was injected

## Expected Result
**TC-009-008-002** Given a valid bearer token + a known device token, when the QA agent calls `POST /test/inject-push` with a valid payload, then the device receives the push within 30 seconds and the payload data fields are exactly what was injected

