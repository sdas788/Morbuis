---
id: TC-ROA-009-017-3
title: Auth completes without restarting the OAuth flow
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-009-017
  - e-009
created: '2026-06-05'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-017
  ac_index: 2
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-017-tf-001-alt-branch-coverage.md
  source_checksum: 6d83b9ee503ea03f
---
## Steps
1. **Setup:** Journey E runs and the app is backgrounded mid-OAuth callback
2. **Action:** returned to foreground
3. **Assert:** auth completes without restarting the OAuth flow

## Expected Result
**TC-009-017-003** Given Journey E runs and the app is backgrounded mid-OAuth callback, when returned to foreground, then auth completes without restarting the OAuth flow

