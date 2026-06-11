---
id: TC-ROA-009-001-2
title: The PR is flagged with a clear error pointing at the file and line
category: e-009-qa-test-automation
scenario: Negative
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-009-001
  - e-009
created: '2026-06-05'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-009-001
  ac_index: 1
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-009-qa-test-automation/S-009-001-maestro-scaffolding.md
  source_checksum: 64dc606b7dda76de
---
## Steps
1. **Setup:** a PR adds a new `<Pressable>` without a testID in `src/`
2. **Action:** the lint rule runs in pre-commit / CI
3. **Assert:** the PR is flagged with a clear error pointing at the file and line

## Expected Result
**TC-009-001-002** Given a PR adds a new `<Pressable>` without a testID in `src/`, when the lint rule runs in pre-commit / CI, then the PR is flagged with a clear error pointing at the file and line

