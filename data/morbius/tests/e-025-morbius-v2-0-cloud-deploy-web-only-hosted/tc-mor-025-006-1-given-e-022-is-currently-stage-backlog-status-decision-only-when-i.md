---
id: TC-MOR-025-006-1
title: 'Given E-022 is currently Stage: Backlog · Status: Decision-only When I'
category: e-025-morbius-v2-0-cloud-deploy-web-only-hosted
scenario: Happy Path
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-025-006
  - e-025
created: '2026-04-30'
updated: '2026-04-30'
pmagent_source:
  slug: morbius
  story_id: S-025-006
  ac_index: 0
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-025-cloud-deploy/S-025-006-e022-gate-flip-direction-addendum.md
  source_checksum: eee394812a347d70
---
## Steps
1. **Setup:** E-022 is currently `Stage: Backlog · Status: Decision-only`
2. **Action:** I update its frontmatter and append a Change Log entry
3. **Assert:** Status becomes `decided` and the changelog row records: *"2026-04-30 · gate flipped to 'decided: yes, migrate Morbius's web-runner agent path to Anthropic Managed Agents as v2.1 (with Agent SDK as fallback)' per user direction during E-025 planning. Rationale: zero CLI/SDK process management in our infra, Anthropic handles scale/retries/observability."*

## Expected Result
Given E-022 is currently `Stage: Backlog · Status: Decision-only` When I update its frontmatter and append a Change Log entry Then Status becomes `decided` and the changelog row records: *"2026-04-30 · gate flipped to 'decided: yes, migrate Morbius's web-runner agent path to Anthropic Managed Agents as v2.1 (with Agent SDK as fallback)' per user direction during E-025 planning. Rationale: zero CLI/SDK process management in our infra, Anthropic handles scale/retries/observability."*

