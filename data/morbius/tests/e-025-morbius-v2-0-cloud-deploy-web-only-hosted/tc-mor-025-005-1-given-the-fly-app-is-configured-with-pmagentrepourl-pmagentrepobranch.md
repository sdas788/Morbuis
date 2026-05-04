---
id: TC-MOR-025-005-1
title: 'Given the Fly app is configured with PMAGENTREPOURL, PMAGENTREPOBRANCH'
category: e-025-morbius-v2-0-cloud-deploy-web-only-hosted
scenario: Happy Path
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
  ac_index: 0
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-025-cloud-deploy/S-025-005-pmagent-repo-checkout.md
  source_checksum: 6bd79f33a771fba0
---
## Steps
1. **Setup:** the Fly app is configured with `PMAGENT_REPO_URL`, `PMAGENT_REPO_BRANCH`, and (for private repos) a deploy key or fine-scoped GitHub PAT as Fly secrets
2. **Action:** the container starts via `scripts/cloud-bootstrap.sh`
3. **Assert:** the bootstrap clones the PMAgent repo to `/data/pmagent-checkout/` if absent, or `git pull`s it if present, then exec's the server with `PMAGENT_HOME=/data/pmagent-checkout` set so `src/parsers/pmagent.ts` finds projects there without code changes

## Expected Result
Given the Fly app is configured with `PMAGENT_REPO_URL`, `PMAGENT_REPO_BRANCH`, and (for private repos) a deploy key or fine-scoped GitHub PAT as Fly secrets When the container starts via `scripts/cloud-bootstrap.sh` Then the bootstrap clones the PMAgent repo to `/data/pmagent-checkout/` if absent, or `git pull`s it if present, then exec's the server with `PMAGENT_HOME=/data/pmagent-checkout` set so `src/parsers/pmagent.ts` finds projects there without code changes

