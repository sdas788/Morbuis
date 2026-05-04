---
id: TC-MOR-025-004-1
title: 'Given the Fly app from S-025-003 is running at https://morbius-rf.fly.'
category: e-025-morbius-v2-0-cloud-deploy-web-only-hosted
scenario: Edge Case
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-025-004
  - e-025
created: '2026-04-30'
updated: '2026-04-30'
pmagent_source:
  slug: morbius
  story_id: S-025-004
  ac_index: 0
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-025-cloud-deploy/S-025-004-cloudflare-access-tunnel-sso.md
  source_checksum: 81ba28397414cc2e
---
## Steps
1. **Setup:** the Fly app from S-025-003 is running at `https://morbius-rf.fly.dev/`
2. **Action:** I set up a Cloudflare Tunnel pointing at the Fly app and bind `morbius.redfoundry.dev` (or similar) to it via Cloudflare DNS
3. **Assert:** opening the public domain terminates TLS at Cloudflare's edge and proxies traffic to the Fly app

## Expected Result
Given the Fly app from S-025-003 is running at `https://morbius-rf.fly.dev/` When I set up a Cloudflare Tunnel pointing at the Fly app and bind `morbius.redfoundry.dev` (or similar) to it via Cloudflare DNS Then opening the public domain terminates TLS at Cloudflare's edge and proxies traffic to the Fly app

