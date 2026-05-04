---
id: TC-MOR-025-007-1
title: 'Given I have a Fly account, a Cloudflare account with the RF zone, RF'
category: e-025-morbius-v2-0-cloud-deploy-web-only-hosted
scenario: Happy Path
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-025-007
  - e-025
created: '2026-04-30'
updated: '2026-04-30'
pmagent_source:
  slug: morbius
  story_id: S-025-007
  ac_index: 0
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-025-cloud-deploy/S-025-007-operator-runbook.md
  source_checksum: a44a0bca6f75ca8d
---
## Steps
1. **Setup:** I have a Fly account, a Cloudflare account with the RF zone, RF Google Workspace admin access, and an Anthropic API key
2. **Action:** I follow `docs/cloud-deploy.md` start-to-finish
3. **Assert:** I produce a working `https://morbius.redfoundry.dev` (or a clone for testing) within 60 minutes, including Cloudflare Access policy and PMAgent checkout

## Expected Result
Given I have a Fly account, a Cloudflare account with the RF zone, RF Google Workspace admin access, and an Anthropic API key When I follow `docs/cloud-deploy.md` start-to-finish Then I produce a working `https://morbius.redfoundry.dev` (or a clone for testing) within 60 minutes, including Cloudflare Access policy and PMAgent checkout

