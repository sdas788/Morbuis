---
id: TC-MOR-025-004-3
title: Given an @redfoundry.com user logs in successfully When their request
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
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-025-cloud-deploy/S-025-004-cloudflare-access-tunnel-sso.md
  source_checksum: 6ab62dc2379d0429
---
## Steps
1. **Setup:** an `@redfoundry.com` user logs in successfully
2. **Action:** their request reaches the Morbius container
3. **Assert:** the per-user identity is forwarded as the `Cf-Access-Authenticated-User-Email` header (Morbius doesn't read it in v2.0, but capture is "free" and v2.1 audit-trail work will use it)

## Expected Result
Given an `@redfoundry.com` user logs in successfully When their request reaches the Morbius container Then the per-user identity is forwarded as the `Cf-Access-Authenticated-User-Email` header (Morbius doesn't read it in v2.0, but capture is "free" and v2.1 audit-trail work will use it)

