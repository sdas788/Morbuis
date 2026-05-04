---
id: TC-MOR-025-001-2
title: 'Given the built image is run with docker run -p 9000:9000 -e MORBIUSDA'
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
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-025-cloud-deploy/S-025-001-dockerfile-container-build.md
  source_checksum: 2faba6eb9c3a11e4
---
## Steps
1. **Setup:** the built image is run with `docker run -p 9000:9000 -e MORBIUS_DATA_DIR=/data -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY -v $(pwd)/data:/data morbius:v2.0`
2. **Action:** I open `localhost:9000`
3. **Assert:** the dashboard renders with the same projects visible (volume-mounted from the laptop's data/), and `claude --version` inside the container resolves to the baked CLI

## Expected Result
Given the built image is run with `docker run -p 9000:9000 -e MORBIUS_DATA_DIR=/data -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY -v $(pwd)/data:/data morbius:v2.0` When I open `localhost:9000` Then the dashboard renders with the same projects visible (volume-mounted from the laptop's data/), and `claude --version` inside the container resolves to the baked CLI

