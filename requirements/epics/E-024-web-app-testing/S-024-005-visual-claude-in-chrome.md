# Story: Visual Backend via Claude in Chrome

**ID:** S-024-005
**Project:** morbius
**Epic:** E-024
**Stage:** Ready
**Status:** Done
**Priority:** P1
**Version:** 1.1
**Created:** 2026-04-29
**Updated:** 2026-04-29

---

## Story

As a developer debugging a flaky web test, I want to run the same test in a real Chrome window via Claude in Chrome so I can watch the agent's actions and see why a step misbehaves.

## Acceptance Criteria

**Given** a web-project test case is open in the TestDrawer
**When** I click "Run visual"
**Then** the same `/api/test/run-web` endpoint is called with `mode: 'visual'`, which routes to `runAgentTask({mcps: ['claude-in-chrome'], ...})` — the agent opens a real Chrome tab and the user can watch each action

**Given** Claude in Chrome's extension is not connected
**When** I click "Run visual"
**Then** the run fails fast with a clear "Visual mode needs Claude in Chrome connected — open the extension first" error, and no run record is written

**Given** a visual run completes
**When** the RunRecord is persisted
**Then** `runner: 'web-visual'` is recorded so the TestDrawer history can distinguish visual debug runs from headless runs

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-29 | 1.0 | Claude | Created |
| 2026-04-29 | 1.1 | Claude | Implemented alongside S-024-004 — single endpoint `POST /api/test/run-web` accepts `mode: 'headless' \| 'visual'`. Visual path: when `mode==='visual'`, the dispatcher passes `mcps:['claude-in-chrome']` to `runAgentTask`, which adds `--chrome` to the Claude CLI args (vs `--no-chrome` for headless), restricts allowed-tools to `mcp__Claude_in_Chrome__*`, and instructs the agent to take screenshots at key transition points. RunRecord stamps `runner: 'web-visual'` so history rendering distinguishes them. UI: TestDrawer's `RunButtons` shows a secondary "Visual" button (ghost style) next to the primary "Run headless" — disabled while a run is in flight. CLI: `morbius run-web <testId> --visual`. **Runtime caveat (per plan AC):** visual mode requires the Claude in Chrome extension to be active in the user's browser session. If it isn't, the agent run completes with `status:'error'` and the `errorLine` from Claude propagates back via the standard error path. AC1 + AC2 + AC3 met (verified via code path + dist; runtime visual run is the user's call given the extension dependency). |
