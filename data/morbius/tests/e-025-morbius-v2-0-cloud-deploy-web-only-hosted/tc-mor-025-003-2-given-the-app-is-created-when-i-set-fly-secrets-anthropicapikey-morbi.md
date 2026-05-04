---
id: TC-MOR-025-003-2
title: 'Given the app is created When I set Fly secrets ANTHROPICAPIKEY, MORBI'
category: e-025-morbius-v2-0-cloud-deploy-web-only-hosted
scenario: Detour
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
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-025-cloud-deploy/S-025-003-fly-io-deploy-secrets.md
  source_checksum: 1fbb96538cf8af6d
---
## Steps
1. **Setup:** the app is created
2. **Action:** I set Fly secrets `ANTHROPIC_API_KEY`, `MORBIUS_DATA_DIR=/data`, and `PMAGENT_HOME=/data/pmagent-checkout`
3. **Assert:** the running container reads them on next boot, and `fly ssh console` confirms `claude --version` works inside the container without an OAuth/keychain prompt (the API key satisfies `apiKeyHelper` auth)

## Expected Result
Given the app is created When I set Fly secrets `ANTHROPIC_API_KEY`, `MORBIUS_DATA_DIR=/data`, and `PMAGENT_HOME=/data/pmagent-checkout` Then the running container reads them on next boot, and `fly ssh console` confirms `claude --version` works inside the container without an OAuth/keychain prompt (the API key satisfies `apiKeyHelper` auth)

