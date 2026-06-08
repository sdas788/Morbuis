---
id: TC-ROA-009-009-3
title: The flow invokes POST /test/inject-push with a topic-targeted payload
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-009-009
  - e-009
created: '2026-06-05'
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-009
  ac_index: 2
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-009-implement-tf-002.md
  source_checksum: 0d3de39d17489435
---
## Steps
1. **Setup:** Journey D's push deep-link
2. **Action:** the flow invokes `POST /test/inject-push` with a topic-targeted payload
3. **Assert:** the device receives the push within 30s and tapping it deep-links to the correct thread

## Expected Result
**TC-009-009-003** Given Journey D's push deep-link, when the flow invokes `POST /test/inject-push` with a topic-targeted payload, then the device receives the push within 30s and tapping it deep-links to the correct thread

