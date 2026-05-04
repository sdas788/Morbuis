---
id: TC-MOR-025-004-4
title: Given I need to roll back the auth gate When I disable the Cloudflare
category: e-025-morbius-v2-0-cloud-deploy-web-only-hosted
scenario: Detour
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
  ac_index: 3
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-025-cloud-deploy/S-025-004-cloudflare-access-tunnel-sso.md
  source_checksum: 96dcd77f9d16d1d4
---
## Steps
1. **Setup:** I need to roll back the auth gate
2. **Action:** I disable the Cloudflare Access app OR pause the Tunnel
3. **Assert:** the URL behaves predictably (Access disabled → public; Tunnel paused → 404), with documented rollback procedure

## Expected Result
Given I need to roll back the auth gate When I disable the Cloudflare Access app OR pause the Tunnel Then the URL behaves predictably (Access disabled → public; Tunnel paused → 404), with documented rollback procedure

