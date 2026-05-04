# Story: PMAgent Repo Checkout on Server-Side Volume

**ID:** S-025-005
**Project:** morbius
**Epic:** E-025
**Stage:** Draft
**Status:** Todo
**Priority:** P1
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

---

## Story

As the cloud Morbius, I need a server-side checkout of the PMAgent repo so the Transfer / Publish round-trip from E-023 keeps working without any user-laptop dependency. Authoring still happens locally; reading + writing test plans happens against this checkout.

## Acceptance Criteria

**Given** the Fly app is configured with `PMAGENT_REPO_URL`, `PMAGENT_REPO_BRANCH`, and (for private repos) a deploy key or fine-scoped GitHub PAT as Fly secrets
**When** the container starts via `scripts/cloud-bootstrap.sh`
**Then** the bootstrap clones the PMAgent repo to `/data/pmagent-checkout/` if absent, or `git pull`s it if present, then exec's the server with `PMAGENT_HOME=/data/pmagent-checkout` set so `src/parsers/pmagent.ts` finds projects there without code changes

**Given** the cloud Morbius is up
**When** a user clicks "Transfer from PMAgent" with `slug=morbius` from the dashboard
**Then** the existing transfer pipeline (E-023) runs against the cloud-checked-out repo and creates / updates Morbius test cases — no laptop required

**Given** PMAgent specs change (a teammate authored a new test plan locally and pushed)
**When** a user wants to pull the latest into the cloud Morbius
**Then** they click a "Refresh from git" button in the Settings → Integrations → PMAgent card, which hits `POST /api/pmagent/refresh` to run `git pull` on the checkout

**Given** the PMAgent repo's deploy key needs rotation
**When** the operator rotates the Fly secret
**Then** the next container restart uses the new credential without any code change; the rotation procedure is documented in the operator runbook (S-025-007)

## Constraints (from epic)

- **C3** — PMAgent stays a separate concern. Cloud Morbius reads from a checkout; we don't touch PMAgent's code or runtime.

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-30 | 1.0 | Claude | Created |
