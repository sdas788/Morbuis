# Story: Dockerfile + Container Build (Claude CLI + Playwright Baked In)

**ID:** S-025-001
**Project:** morbius
**Epic:** E-025
**Stage:** Ready
**Status:** Todo
**Priority:** P0
**Version:** 1.1
**Created:** 2026-04-30
**Updated:** 2026-04-30

---

## Story

As the developer kicking off v2.0, I want a `Dockerfile` that produces a self-contained Morbius image with the Claude CLI and Playwright + Chromium baked in, so the cloud deploy doesn't require any host-side dependencies and a fresh container can run web tests on first boot.

## Acceptance Criteria

**Given** a clean checkout of the Morbius repo
**When** I run `docker build -t morbius:v2.0 .`
**Then** the build succeeds and produces an image that contains: Node 20, the compiled `dist/`, production `node_modules`, `@anthropic-ai/claude-code` CLI globally available on PATH, and `playwright` with Chromium installed via `--with-deps` (system libs picked up)

**Given** the built image is run with `docker run -p 9000:9000 -e MORBIUS_DATA_DIR=/data -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY -v $(pwd)/data:/data morbius:v2.0`
**When** I open `localhost:9000`
**Then** the dashboard renders with the same projects visible (volume-mounted from the laptop's data/), and `claude --version` inside the container resolves to the baked CLI

**Given** the image is built without a network at runtime (offline)
**When** I `docker run` it
**Then** Playwright is able to launch headless Chromium against an internal target URL (no need to download browser binaries at startup)

## Constraints (from epic)

- **C5** — pin `@anthropic-ai/claude-code@1.x.x` so a surprise upstream change doesn't break production. Bumps are explicit.

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-30 | 1.0 | Claude | Created |
| 2026-04-30 | 1.1 | Claude | Authored `Dockerfile` (multi-stage Node 20-slim, builder→runtime, `@anthropic-ai/claude-code@1` pinned per C5, Playwright Chromium baked via `--with-deps`) and `.dockerignore`. Stage flipped Draft→Ready. Status stays Todo: AC-001/002/003 require an actual `docker build`/`docker run` to verify; Docker isn't installed locally, so verification rolls into the S-025-003 Fly remote build (which is the production-equivalent of AC-001). Flip Status to Done after first successful Fly deploy. |
