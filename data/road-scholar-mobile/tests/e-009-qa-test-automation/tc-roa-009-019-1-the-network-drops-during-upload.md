---
id: TC-ROA-009-019-1
title: The network drops during upload
category: e-009-qa-test-automation
scenario: Happy Path
status: not-run
priority: P4
platforms:
  - android
  - ios
tags:
  - s-009-019
  - e-009
created: '2026-06-05'
updated: '2026-06-05'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-019
  ac_index: 0
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-019-tf-003-alt-branch-coverage.md
  source_checksum: 6236a3d32626a176
---
## Steps
1. **Setup:** the avatar-upload-mid-failure alt
2. **Action:** the network drops during upload
3. **Assert:** the draft avatar is preserved in the form + a retry button is shown + a successful retry uploads correctly

## Expected Result
**TC-009-019-001** Given the avatar-upload-mid-failure alt, when the network drops during upload, then the draft avatar is preserved in the form + a retry button is shown + a successful retry uploads correctly

