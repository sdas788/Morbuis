# Story: Web Runner via Playwright MCP (Headless)

**ID:** S-024-004
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

As a QA lead, I want to click Run on a web-app test case in Morbius and have a headless Chromium drive the test against the project's `webUrl`, returning pass/fail with screenshots — so I can validate web apps without authoring Playwright specs by hand.

## Acceptance Criteria

**Given** a project with `projectType: 'web'` and `webUrl: '<url>'` is active
**When** I `POST /api/test/run-web { testId }`
**Then** Morbius builds a prompt from the test case (title + steps + acceptance criteria + base URL), calls `runAgentTask({mcps: ['playwright-mcp'], prompt})`, parses structured JSON `{status, stepsExecuted, screenshots, error?}`, writes a `RunRecord` with `runner: 'web-headless'` + `targetUrl: '<url>'`, and returns `{ok, runId, status, screenshotCount}`

**Given** the agent emits screenshot files
**When** the run completes
**Then** the screenshots are persisted under `data/{projectId}/runs/<runId>/` and referenced via `RunRecord.screenshots[]` so the TestDrawer history can render them

**Given** the agent run exceeds the 5-minute timeout, errors out, or returns malformed JSON
**When** the failure is detected
**Then** the run record persists with `status: 'error'` + `errorLine` populated, and the prior pass history is unaffected

**Given** the dashboard's TestDrawer is open on a web-project test case
**When** it renders
**Then** the Run section shows a primary "Run headless" button (and gates the existing Android/iOS buttons off when `projectType === 'web'`); clicking it fires the new endpoint and refreshes Run History

**Given** the CLI command `morbius run-web <testId>`
**When** invoked
**Then** it composes the same pipeline and prints the resulting status + screenshot count

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-29 | 1.0 | Claude | Created |
| 2026-04-29 | 1.1 | Claude | Implemented end-to-end. New endpoint `POST /api/test/run-web { testId, mode? }` validates the active project is `projectType:'web'` with a `webUrl`, builds an instructions prompt (base URL + steps + acceptance criteria + JSON-output schema spec), calls `runAgentTask({mcps:['playwright-mcp'], ...})` (or `['claude-in-chrome']` when `mode:'visual'`) from S-024-003, parses the agent's `{status, screenshots, errorLine?, domSnapshot?}` JSON, writes a `RunRecord` with `runner:'web-headless'/'web-visual'`, and updates the test case status. Latest pointer file written so kanban thumbnails work. New `RunButtons` React component in TestDrawer (`src/server.ts`) reads `ACTIVE_PROJECT_CONFIG.projectType` and renders: web → "Run headless" (primary) + "Visual" (ghost) with inline pass/fail status pill; api → disabled placeholder; mobile → legacy Run button. New CLI: `morbius run-web <testId> [--visual]`. **Live-verified the dogfood walkthrough:** set Morbius's `morbius` project to projectType=web + webUrl=http://localhost:9000, fired test TC-MOR-013-001-1 via the endpoint → returned `{ok:true, runId:'web-1777494136209', status:'pass', screenshotCount:2, durationMs:141287}` in 141s. Notable: Claude+Playwright didn't just run the test — it read the source code to verify the AC was actually satisfied (jiraErrorBuffer location, code enum values, endpoint location), captured this in `domSnapshot`. RunRecord persisted to `data/morbius/runs/web-1777494136209.json` with both screenshots; `/api/runs/TC-MOR-013-001-1/history` returns the record cleanly. AC1 + AC2 + AC3 + AC4 + AC5 met. |
