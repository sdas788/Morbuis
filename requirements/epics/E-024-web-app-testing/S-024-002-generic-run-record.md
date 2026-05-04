# Story: Generic RunRecord (replace Maestro-shaped)

**ID:** S-024-002
**Project:** morbius
**Epic:** E-024
**Stage:** Ready
**Status:** Done
**Priority:** P0
**Version:** 1.1
**Created:** 2026-04-29
**Updated:** 2026-04-29

---

## Story

As the run-history pipeline, I want a single `RunRecord` shape that handles both Maestro and web runs, so persisted run records and history APIs work consistently regardless of runner type.

## Acceptance Criteria

**Given** the `RunRecord` interface is widened (Maestro fields `failingStep` / `errorLine` / `exitCode` become optional, new fields `runner`, `target`, `screenshots[]`, `targetUrl?`, `domSnapshot?`)
**When** existing Maestro run records are deserialized via `loadAllRuns(dir)`
**Then** they round-trip cleanly with the Maestro fields populated and the new web-only fields absent

**Given** a fresh web run record is written
**When** the TestDrawer's Run History section renders it
**Then** it shows `targetUrl` + screenshot count instead of failing-step/error-line, and the runner type appears as a small badge (`web-headless` / `web-visual` / `maestro`)

**Given** existing endpoints `/api/runs/:testId/history` and `/api/runs/latest-all`
**When** they return a mix of Maestro and web records
**Then** both render correctly in the UI without errors

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-29 | 1.0 | Claude | Created |
| 2026-04-29 | 1.1 | Claude | Implemented: widened the canonical run-record interface in `src/types.ts` from `MaestroRunRecord` (Maestro-shaped) to a generic `RunRecord` with discriminator `runner: 'maestro' \| 'web-headless' \| 'web-visual' \| 'manual'`, optional Maestro-only fields (`exitCode`, `failingStep`, `screenshotPath`), shared `errorLine`, and new web fields `screenshots[]`, `targetUrl?`, `domSnapshot?`. `MaestroRunRecord` kept as a back-compat alias so existing callers compile; the three Maestro spawn sites in `server.ts` (lines ~565, ~824, ~901) now stamp `runner:'maestro'` + `target` explicitly. `writeRunRecord` widened to handle optional fields via `?? null`. TestDrawer "Run history" section in `server.ts` now renders the runner badge (e.g. `WEB · HEADLESS`) and either `failingStep` or `targetUrl + N screenshots` depending on shape; expanded view shows runner + targetUrl rows when present and lists each entry of `screenshots[]`. Live verified: an injected web-shape record at `data/morbius/runs/run-test-web-001.json` round-trips through `/api/runs/TC-MOR-013-001-1/history` and renders as `Apr 29, 01:00 PM · WEB · HEADLESS · http://localhost:9000 · 2 📸 · 42.0s` in the drawer; existing Maestro records in micro-air/sts unaffected. AC1 + AC2 + AC3 met. |
