# Story: Fly.io Deploy + Secrets

**ID:** S-025-003
**Project:** morbius
**Epic:** E-025
**Stage:** Draft
**Status:** Todo
**Priority:** P0
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

---

## Story

As an operator deploying Morbius v2.0, I want `fly.toml` and a documented `fly launch` recipe so I can take the Docker image from S-025-001 and put it behind a Fly URL with persistent storage and the right secrets — in under 15 minutes, with no surprises.

## Acceptance Criteria

**Given** a Fly.io account and the `flyctl` CLI installed
**When** I run `fly launch` from the Morbius repo (with `fly.toml` checked in)
**Then** Fly creates an app `morbius-rf` (or similar), provisions a 1 GB / 1 vCPU VM in `iad`, mounts a 10 GB volume at `/data`, builds from the local Dockerfile, and starts the container

**Given** the app is created
**When** I set Fly secrets `ANTHROPIC_API_KEY`, `MORBIUS_DATA_DIR=/data`, and `PMAGENT_HOME=/data/pmagent-checkout`
**Then** the running container reads them on next boot, and `fly ssh console` confirms `claude --version` works inside the container without an OAuth/keychain prompt (the API key satisfies `apiKeyHelper` auth)

**Given** the app is running
**When** I hit `https://morbius-rf.fly.dev/`
**Then** the dashboard returns 200 and the Morbius UI renders. Auto-scale-to-zero is OFF (Morbius needs to be warm so SSE/long-running agent calls don't drop). Healthcheck `GET /` is configured. Restart policy `on-failure` with 3 retries.

**Given** I push a new build with `fly deploy`
**When** the rollout finishes
**Then** the volume's data is preserved (projects, test cases, run history all intact post-rollout)

## Constraints (from epic)

- **C1** — total infra <$30/mo. 1 GB RAM minimum because Chromium is heavy under load.
- **C2** — single instance; no horizontal scale in v2.0.

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-30 | 1.0 | Claude | Created |
