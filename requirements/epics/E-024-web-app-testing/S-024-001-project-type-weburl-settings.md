# Story: Project Type + WebUrl + Settings UI

**ID:** S-024-001
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

As the developer kicking off E-024, I want a `projectType` field on `ProjectConfig` (mobile/web/api) plus a `webUrl` field, surfaced in Settings → Workspace, so the rest of the epic has a clean per-project signal to dispatch the right runner.

## Acceptance Criteria

**Given** an existing Morbius project (e.g. micro-air)
**When** I open Settings → Workspace
**Then** I see a `projectType` dropdown defaulting to `mobile` and a `webUrl` input that surfaces only when `web` is selected, both saved via `POST /api/config/update`

**Given** a project's `projectType` is `web`
**When** I look at the sidebar project pill
**Then** a tiny `web` badge appears next to the project name so the run-mode is always visible

**Given** the E-023 PMAgent transfer pipeline runs against a project whose PMAgent `brief.md` contains a "Project Type" line
**When** the new Morbius project is created
**Then** `projectType` is auto-derived from that line; otherwise the project defaults to `mobile`

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-29 | 1.0 | Claude | Created |
| 2026-04-29 | 1.1 | Claude | Implemented: created E-024 epic + 6 story files (visible on PMAgent board via the symlink). Extended `ProjectConfig` (`src/types.ts`) with `projectType?: 'mobile'|'web'|'api'` (default mobile for back-compat) + `webUrl?: string`, and exported new `ProjectType` type. Settings → Workspace card gets a Project type dropdown + a webUrl input that surfaces only when type=web; both persist live via `POST /api/config/update` on change/blur. Sidebar project pill now shows a tiny `WEB` accent badge next to the name when projectType==='web' and replaces the appId line with the webUrl. PMAgent transfer pipeline (`runPMAgentTransfer`) now reads `<pmagentPath>/brief.md` for `**Project Type:** mobile/web/api` + optional `**Web URL:** <url>` lines and stamps them on the new ProjectConfig at create time; existing projects are upgraded only if the field was unset. Live verified against the morbius project: switched type→web + saved url=http://localhost:9000, sidebar shows `morbius · WEB · http://localhost:9000`. AC1 + AC2 + AC3 met. |
