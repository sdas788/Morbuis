# Story: Operator Runbook + First-Deploy Walkthrough

**ID:** S-025-007
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

As an RF engineer who isn't Saurabh, I want a runbook at `docs/cloud-deploy.md` that walks me through deploying Morbius v2.0 from scratch — Fly app, Cloudflare Tunnel, Cloudflare Access, secrets, rollouts, rollback, monitoring — in under 60 minutes without asking questions.

## Acceptance Criteria

**Given** I have a Fly account, a Cloudflare account with the RF zone, RF Google Workspace admin access, and an Anthropic API key
**When** I follow `docs/cloud-deploy.md` start-to-finish
**Then** I produce a working `https://morbius.redfoundry.dev` (or a clone for testing) within 60 minutes, including Cloudflare Access policy and PMAgent checkout

**Given** the doc has a Troubleshooting section
**When** I hit any of these failure modes
**Then** I find the fix in the doc:
- "Claude CLI says not logged in" → check `ANTHROPIC_API_KEY` Fly secret
- "Playwright errors on Chromium launch" → confirm `--with-deps` was used in the Dockerfile
- "PMAgent transfer says path not found" → check the bootstrap script ran, deploy key valid
- "SSE chat connection drops" → check Fly idle-timeout config

**Given** the doc has a Rollout / Rollback section
**When** I push a bad build
**Then** I can find the `fly releases list` + `fly deploy --image <prev-sha>` recipe to roll back in under 5 minutes

**Given** the doc has a Cost Monitoring section
**When** I want to check what we're spending
**Then** I find pointers to: Fly billing dashboard, Cloudflare Access usage (free tier limit), Anthropic API usage page

## Constraints (from epic)

- **C1** — total monthly infra <$30 + Anthropic API per-run. The runbook includes a section on monitoring those costs.

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-30 | 1.0 | Claude | Created |
