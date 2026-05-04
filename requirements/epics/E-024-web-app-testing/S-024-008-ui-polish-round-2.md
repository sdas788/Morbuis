# Story: UI Polish Round 2 — Topbar Run + Coverage Card + Quick Actions

**ID:** S-024-008
**Project:** morbius
**Epic:** E-024
**Stage:** Ready
**Status:** Done
**Priority:** P2
**Version:** 1.1
**Created:** 2026-04-29
**Updated:** 2026-04-29

---

## Story

As a QA lead on a web project, I want every primary call-to-action and the Coverage summary to speak the right language for my project type — no leftover "Maestro" labels or "Android · iOS" pills when I'm testing a web app — so the dashboard stops creating cognitive overhead the first time someone opens it.

## Acceptance Criteria

**Given** the active project's `projectType` is `web`
**When** I look at the topbar
**Then** the action button reads "Run tests" (not "Run suite") and clicking it navigates to Test Cases (not the Maestro view); for `mobile` projects the existing "Run suite" → Maestro behavior is preserved

**Given** the same project type is `web`
**When** the Dashboard renders the Coverage stat card
**Then** the small pills under the percentage show `Headless` + `Visual` (purple) instead of `Android · iOS`; for `mobile` the original `Android · iOS` pill is preserved; for `api` a muted "API · v1 not implemented" placeholder appears

**Given** the Dashboard's Quick Actions card is visible
**When** the project type is `web`
**Then** the first action reads "Run web tests" and routes to Test Cases; for `mobile` it preserves "Run all flows" → Maestro

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-29 | 1.0 | Claude | Created |
| 2026-04-29 | 1.1 | Claude | Implemented. (a) Topbar's run-suite button gates by projectType: web → "Run tests" + tooltip "Open Test Cases — run web tests one at a time via the agent (no batch suite runner in v1)"; mobile → existing "Run suite" with Maestro destination; api → disabled with explanatory tooltip. App-shell `onRunSuite` callback also routes to `tests` view for web vs `maestro` for mobile. (b) Dashboard Coverage stat card pills swap by project type: web → 🌐 Headless + Visual (purple); api → "API · v1 not implemented" (muted); mobile → existing Android · iOS (preserved). (c) Dashboard Quick Actions: web replaces "Run all flows" → Maestro with "Run web tests" → Test Cases; mobile preserved. Live verified on the morbius project: topbar shows "Run tests", Coverage shows Headless + Visual, Quick Actions shows "Run web tests". Switched to micro-air → all three reverted to mobile labels. AC1 + AC2 + AC3 met. |
