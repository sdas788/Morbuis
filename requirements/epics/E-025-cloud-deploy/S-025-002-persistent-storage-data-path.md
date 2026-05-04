# Story: Persistent Storage + Data Path Config

**ID:** S-025-002
**Project:** morbius
**Epic:** E-025
**Stage:** Ready
**Status:** Done
**Priority:** P0
**Version:** 1.1
**Created:** 2026-04-30
**Updated:** 2026-04-30

---

## Story

As the cloud deploy, I want Morbius to read its data directory from `MORBIUS_DATA_DIR` env var so the container can point at a Fly.io persistent volume mounted at `/data`, without code changes that would affect laptop usage.

## Acceptance Criteria

**Given** the env var `MORBIUS_DATA_DIR=/tmp/morbius-test` is set
**When** the server boots and a user creates a project via `POST /api/projects/create`
**Then** `data/projects.json` and the project's `tests/` / `bugs/` / `runs/` subdirs are written under `/tmp/morbius-test/`, not `<cwd>/data/`

**Given** the env var is NOT set (laptop default)
**When** the server boots
**Then** the data path resolves to `<cwd>/data/` exactly as it does today (no behavior change for existing local users)

**Given** the server starts in any mode
**When** it logs its boot banner
**Then** a single line confirms the resolved data dir, e.g. `data dir: /data` — so the operator can verify the volume is mounted correctly

## Constraints (from epic)

- **C2** — single shared workspace; the existing markdown writers are last-write-wins. v2.0 doesn't add per-user isolation.

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-30 | 1.0 | Claude | Created |
| 2026-04-30 | 1.1 | Claude | Shipped. New `src/data-dir.ts` resolver: `MORBIUS_DATA_DIR` if set (resolved to absolute), else `<cwd>/data`. Imported by `src/server.ts`, `src/index.ts`, `src/parsers/markdown.ts`, `src/parsers/excel.ts` — all four hardcoded `process.cwd()/data` constants replaced. Boot banner adds `data dir: <path>`. Verified end-to-end: with `MORBIUS_DATA_DIR=/tmp/morbius-test` the create-project endpoint wrote `projects.json` + `<id>/{config.json,tests,bugs,runs,screenshots}` under `/tmp/morbius-test`; with the env unset, banner reads `/Users/sdas/Morbius/data`. |
