---
id: TC-ROA-009-018-5
title: A clear "your account has been suspended" message is shown instead of a redir…
category: e-009-qa-test-automation
scenario: Detour
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-009-018
  - e-009
created: '2026-06-05'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-018
  ac_index: 4
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-018-tf-002-alt-branch-coverage.md
  source_checksum: 585ff9589e52c9a8
---
## Steps
1. **Setup:** the banned-user OAuth recovery alt
2. **Action:** a banned user attempts SSO
3. **Assert:** a clear "your account has been suspended" message is shown instead of a redirect to Home

## Expected Result
**TC-009-018-005** Given the banned-user OAuth recovery alt, when a banned user attempts SSO, then a clear "your account has been suspended" message is shown instead of a redirect to Home

