---
id: TC-ROA-009-008-4
title: The QA agent calls POST /test/inject-push targeting a forum's topic
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-009-008
  - e-009
created: '2026-06-05'
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-008
  ac_index: 3
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-008-backend-fixtures-push-hook.md
  source_checksum: cc2fc5c653f62c5f
---
## Steps
1. **Setup:** the topic-targeted form `{ topic, payload }`
2. **Action:** the QA agent calls `POST /test/inject-push` targeting a forum's topic
3. **Assert:** **all** devices subscribed to that topic receive the push (verifies the per-forum subscription path from S-005-003)

## Expected Result
**TC-009-008-004** Given the topic-targeted form `{ topic, payload }`, when the QA agent calls `POST /test/inject-push` targeting a forum's topic, then **all** devices subscribed to that topic receive the push (verifies the per-forum subscription path from S-005-003)

