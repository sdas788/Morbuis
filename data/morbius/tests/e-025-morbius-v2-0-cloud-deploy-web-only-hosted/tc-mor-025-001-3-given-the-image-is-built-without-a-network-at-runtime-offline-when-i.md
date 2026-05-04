---
id: TC-MOR-025-001-3
title: Given the image is built without a network at runtime (offline) When I
category: e-025-morbius-v2-0-cloud-deploy-web-only-hosted
scenario: Detour
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-025-001
  - e-025
created: '2026-04-30'
updated: '2026-04-30'
pmagent_source:
  slug: morbius
  story_id: S-025-001
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-025-cloud-deploy/S-025-001-dockerfile-container-build.md
  source_checksum: 444c93ed12576d23
---
## Steps
1. **Setup:** the image is built without a network at runtime (offline)
2. **Action:** I `docker run` it
3. **Assert:** Playwright is able to launch headless Chromium against an internal target URL (no need to download browser binaries at startup)

## Expected Result
Given the image is built without a network at runtime (offline) When I `docker run` it Then Playwright is able to launch headless Chromium against an internal target URL (no need to download browser binaries at startup)

