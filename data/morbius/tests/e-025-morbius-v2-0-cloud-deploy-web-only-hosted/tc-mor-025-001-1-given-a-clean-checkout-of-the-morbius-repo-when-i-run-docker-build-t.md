---
id: TC-MOR-025-001-1
title: Given a clean checkout of the Morbius repo When I run docker build -t
category: e-025-morbius-v2-0-cloud-deploy-web-only-hosted
scenario: Happy Path
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
  ac_index: 0
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-025-cloud-deploy/S-025-001-dockerfile-container-build.md
  source_checksum: eddf0ca32ef7e652
---
## Steps
1. **Setup:** a clean checkout of the Morbius repo
2. **Action:** I run `docker build -t morbius:v2.0 .`
3. **Assert:** the build succeeds and produces an image that contains: Node 20, the compiled `dist/`, production `node_modules`, `@anthropic-ai/claude-code` CLI globally available on PATH, and `playwright` with Chromium installed via `--with-deps` (system libs picked up)

## Expected Result
Given a clean checkout of the Morbius repo When I run `docker build -t morbius:v2.0 .` Then the build succeeds and produces an image that contains: Node 20, the compiled `dist/`, production `node_modules`, `@anthropic-ai/claude-code` CLI globally available on PATH, and `playwright` with Chromium installed via `--with-deps` (system libs picked up)

