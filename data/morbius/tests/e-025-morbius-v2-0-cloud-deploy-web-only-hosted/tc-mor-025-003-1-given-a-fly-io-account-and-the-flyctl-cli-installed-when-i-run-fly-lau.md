---
id: TC-MOR-025-003-1
title: Given a Fly.io account and the flyctl CLI installed When I run fly lau
category: e-025-morbius-v2-0-cloud-deploy-web-only-hosted
scenario: Happy Path
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
  ac_index: 0
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-025-cloud-deploy/S-025-003-fly-io-deploy-secrets.md
  source_checksum: ff9d5000b7f87db4
---
## Steps
1. **Setup:** a Fly.io account and the `flyctl` CLI installed
2. **Action:** I run `fly launch` from the Morbius repo (with `fly.toml` checked in)
3. **Assert:** Fly creates an app `morbius-rf` (or similar), provisions a 1 GB / 1 vCPU VM in `iad`, mounts a 10 GB volume at `/data`, builds from the local Dockerfile, and starts the container

## Expected Result
Given a Fly.io account and the `flyctl` CLI installed When I run `fly launch` from the Morbius repo (with `fly.toml` checked in) Then Fly creates an app `morbius-rf` (or similar), provisions a 1 GB / 1 vCPU VM in `iad`, mounts a 10 GB volume at `/data`, builds from the local Dockerfile, and starts the container

