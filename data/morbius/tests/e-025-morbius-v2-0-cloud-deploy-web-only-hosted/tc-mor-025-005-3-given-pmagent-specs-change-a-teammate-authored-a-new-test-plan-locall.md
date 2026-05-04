---
id: TC-MOR-025-005-3
title: Given PMAgent specs change (a teammate authored a new test plan locall
category: e-025-morbius-v2-0-cloud-deploy-web-only-hosted
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-025-005
  - e-025
created: '2026-04-30'
updated: '2026-04-30'
pmagent_source:
  slug: morbius
  story_id: S-025-005
  ac_index: 2
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-025-cloud-deploy/S-025-005-pmagent-repo-checkout.md
  source_checksum: f7c9e878c9d91a91
---
## Steps
1. **Setup:** PMAgent specs change (a teammate authored a new test plan locally and pushed)
2. **Action:** a user wants to pull the latest into the cloud Morbius
3. **Assert:** they click a "Refresh from git" button in the Settings → Integrations → PMAgent card, which hits `POST /api/pmagent/refresh` to run `git pull` on the checkout

## Expected Result
Given PMAgent specs change (a teammate authored a new test plan locally and pushed) When a user wants to pull the latest into the cloud Morbius Then they click a "Refresh from git" button in the Settings → Integrations → PMAgent card, which hits `POST /api/pmagent/refresh` to run `git pull` on the checkout

