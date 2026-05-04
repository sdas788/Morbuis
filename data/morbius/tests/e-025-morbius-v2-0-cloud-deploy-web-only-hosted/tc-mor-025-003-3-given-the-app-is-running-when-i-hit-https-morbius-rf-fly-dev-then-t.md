---
id: TC-MOR-025-003-3
title: 'Given the app is running When I hit https://morbius-rf.fly.dev/ Then t'
category: e-025-morbius-v2-0-cloud-deploy-web-only-hosted
scenario: Edge Case
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-025-003
  - e-025
created: '2026-04-30'
updated: '2026-04-30'
pmagent_source:
  slug: morbius
  story_id: S-025-003
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-025-cloud-deploy/S-025-003-fly-io-deploy-secrets.md
  source_checksum: 64b0c51690efbdfb
---
## Steps
1. **Setup:** the app is running
2. **Action:** I hit `https://morbius-rf.fly.dev/`
3. **Assert:** the dashboard returns 200 and the Morbius UI renders. Auto-scale-to-zero is OFF (Morbius needs to be warm so SSE/long-running agent calls don't drop). Healthcheck `GET /` is configured. Restart policy `on-failure` with 3 retries.

## Expected Result
Given the app is running When I hit `https://morbius-rf.fly.dev/` Then the dashboard returns 200 and the Morbius UI renders. Auto-scale-to-zero is OFF (Morbius needs to be warm so SSE/long-running agent calls don't drop). Healthcheck `GET /` is configured. Restart policy `on-failure` with 3 retries.

