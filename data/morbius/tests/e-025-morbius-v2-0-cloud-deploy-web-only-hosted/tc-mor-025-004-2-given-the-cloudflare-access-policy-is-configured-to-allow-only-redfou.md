---
id: TC-MOR-025-004-2
title: Given the Cloudflare Access policy is configured to allow only @redfou
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
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-025-cloud-deploy/S-025-004-cloudflare-access-tunnel-sso.md
  source_checksum: 38e2411148df2a55
---
## Steps
1. **Setup:** the Cloudflare Access policy is configured to allow only `@redfoundry.com` Google Workspace identities
2. **Action:** a non-RF account tries to log in
3. **Assert:** Cloudflare Access denies them with a clear message; the request never reaches Morbius

## Expected Result
Given the Cloudflare Access policy is configured to allow only `@redfoundry.com` Google Workspace identities When a non-RF account tries to log in Then Cloudflare Access denies them with a clear message; the request never reaches Morbius

