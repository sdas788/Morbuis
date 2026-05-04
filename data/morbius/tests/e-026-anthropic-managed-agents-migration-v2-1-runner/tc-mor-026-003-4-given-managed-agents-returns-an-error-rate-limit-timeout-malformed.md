---
id: TC-MOR-026-003-4
title: 'Given Managed Agents returns an error (rate limit, timeout, malformed'
category: e-026-anthropic-managed-agents-migration-v2-1-runner
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-026-003
  - e-026
created: '2026-04-30'
updated: '2026-04-30'
pmagent_source:
  slug: morbius
  story_id: S-026-003
  ac_index: 3
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-026-managed-agents-migration/S-026-003-implement-managed-agents-mode.md
  source_checksum: 9726b7602728040e
---
## Steps
1. **Setup:** Managed Agents returns an error (rate limit, timeout, malformed response)
2. **Action:** the runner hits the error
3. **Assert:** it fails clearly with a useful message — does NOT silently fall back to CLI mode (that would mask v2.1 reliability issues)

## Expected Result
Given Managed Agents returns an error (rate limit, timeout, malformed response) When the runner hits the error Then it fails clearly with a useful message — does NOT silently fall back to CLI mode (that would mask v2.1 reliability issues)

