---
id: TC-MOR-016-003-3
title: Given Jira webhooks are unreachable When the webhook-receive endpoint
category: e-016-bug-impact-ai-ticket-repro
scenario: Detour
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-016-003
  - e-016
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-016-003
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-016-bug-impact-ai/S-016-003-jira-webhook-regen.md
  source_checksum: 50116283290bbe79
---
## Steps
1. **Setup:** Jira webhooks are unreachable
2. **Action:** the webhook-receive endpoint is down for >5 minutes
3. **Assert:** polling fallback triggers regeneration on the next sync cycle — no state changes are silently missed ---

## Expected Result
Given Jira webhooks are unreachable When the webhook-receive endpoint is down for >5 minutes Then polling fallback triggers regeneration on the next sync cycle — no state changes are silently missed ---

