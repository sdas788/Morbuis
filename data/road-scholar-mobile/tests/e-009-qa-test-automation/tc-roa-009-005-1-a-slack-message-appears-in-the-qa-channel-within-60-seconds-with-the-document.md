---
id: TC-ROA-009-005-1
title: A Slack message appears in the QA channel within 60 seconds with the document…
category: e-009-qa-test-automation
scenario: Happy Path
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-009-005
  - e-009
created: '2026-06-05'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-005
  ac_index: 0
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-005-slack-failure-alert.md
  source_checksum: 5e02d5bab8406e91
---
## Steps
1. **Setup:** a PR-E2E workflow fails
2. **Action:** Bitrise's post-build steps run
3. **Assert:** a Slack message appears in the QA channel within 60 seconds with the documented fields

## Expected Result
**TC-009-005-001** Given a PR-E2E workflow fails, when Bitrise's post-build steps run, then a Slack message appears in the QA channel within 60 seconds with the documented fields

