---
id: TC-ROA-009-008-3
title: The endpoint returns 401 — the endpoint is not reachable without proper auth
category: e-009-qa-test-automation
scenario: Negative
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
  ac_index: 2
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-008-backend-fixtures-push-hook.md
  source_checksum: cf613e29c4a37d34
---
## Steps
1. **Setup:** an invalid bearer token
2. **Action:** the QA agent calls `POST /test/inject-push`
3. **Assert:** the endpoint returns 401 — the endpoint is not reachable without proper auth

## Expected Result
**TC-009-008-003** Given an invalid bearer token, when the QA agent calls `POST /test/inject-push`, then the endpoint returns 401 — the endpoint is not reachable without proper auth

