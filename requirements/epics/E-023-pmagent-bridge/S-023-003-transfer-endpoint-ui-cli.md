# Story: Transfer Endpoint + Morbius UI Button + CLI

**ID:** S-023-003
**Project:** morbius
**Epic:** E-023
**Stage:** Ready
**Status:** Done
**Priority:** P0
**Version:** 1.1
**Created:** 2026-04-23
**Updated:** 2026-04-23

---

## Story

As a QA lead, I want one user action — CLI command, dashboard button, or future PMAgent button — to turn a PMAgent project's QA plan into a Morbius project with all test cases imported, and re-running the action to be idempotent so my run history is never lost.

## Acceptance Criteria

**Given** a PMAgent project with epics + stories (and optionally test plans) at `<pmagentPath>`
**When** I `POST /api/pmagent/transfer { pmagentSlug }` (or run `morbius pmagent-sync <slug>`)
**Then** Morbius creates the target project if missing, runs the parser, and writes test cases via `writeParsedExcel` — each carrying `pmagentSource` frontmatter for traceability

**Given** I re-run the same transfer with no source changes
**When** the pipeline runs
**Then** every test case shows `untouched` (checksum matched) and `history[]` + `changelog[]` are preserved exactly as they were

**Given** I edit one AC in a PMAgent story file and re-run the transfer
**When** the pipeline runs
**Then** exactly one test case shows `updated`, the rest show `untouched`, and the updated test case keeps its existing `history[]` and `changelog[]`

**Given** PMAgent has not built its Transfer button yet
**When** I open the Morbius dashboard's project switcher
**Then** a "Transfer from PMAgent" entry sits next to "+ New project", opens a modal that runs `/api/pmagent/preview` to show counts + sample, and confirms via `/api/pmagent/transfer`

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
| 2026-04-23 | 1.1 | Claude | Implemented end-to-end: (a) `runPMAgentTransfer()` orchestrator in `src/server.ts` — resolves path → parses via S-023-002 → derives or creates Morbius project (auto-name from PMAgent `brief.md` H1, fallback to slug) → loads existing on-disk test cases by ID → grafts `history[]`, `deviceResults[]`, `status`, `maestroFlow*`, `changelog`, `notes` onto the new test before write (history-preservation invariant) → diffs `sourceChecksum` against `pmagent-sync-state.json` to skip unchanged ACs → writes via `writeTestCase` → cleans up orphaned files when filenames change due to title updates → persists new sync state. Three new endpoints: `POST /api/pmagent/preview` (parse + sample, no write), `POST /api/pmagent/transfer` (full pipeline). Note: `/api/pmagent/test-path` from S-023-001 stays for the Settings card. UI: new "Transfer from PMAgent…" entry next to "+ New project" in the project switcher dropdown opens `TransferFromPMAgentModal` — phases: input → previewing → preview (cards list, sample test rows, skipped sheets) → transferring → done (success card with counts). New CLI: `morbius pmagent-sync <slug> [--target] [--path] [--force] [--dry-run]`. **Live verified** against the morbius PMAgent project: 200 test cases / 16 categories transferred in 42ms; second run reports 200 untouched (idempotent); UI Confirm transfer shows "✓ Transferred to project: morbius" with full counts. Each test case carries `pmagent_source: { slug, story_id, ac_index, source_path, source_checksum }` frontmatter for traceability per AC1. AC1 + AC2 + AC3 + AC4 met. Side-fix: parser quality (strip `**Given**` bold markers) + orphan cleanup when titles change. |
