# Story: Project-Type UI Signaling (Web vs Mobile vs API)

**ID:** S-024-007
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

As a QA lead switching between mobile and web projects all day, I want the dashboard to make the project type unmistakable at every level — sidebar, topbar, kanban cards, run status — so I never accidentally try to run a Maestro flow against a web project (or vice versa). The earlier S-024-001 added a tiny corner badge; that's not enough.

## Acceptance Criteria

**Given** I open a project with `projectType: 'web'`
**When** the dashboard renders
**Then** every visible signal tells me it's web: the project pill has a purple accent + 🌐 WEB group label, the run-status section shows Playwright/Chrome/Target URL (not Maestro/Android/iOS), the topbar pills mirror that, irrelevant nav items (Devices, Maestro, Healing) are hidden, and each kanban card shows a 🌐 web badge

**Given** I switch to a `projectType: 'mobile'` project
**When** the dashboard re-renders
**Then** the inverse holds: orange 📱 MOBILE accent, Maestro CLI/Android/iOS in run status + topbar, Devices/Maestro/Healing nav items reappear, kanban cards show 📱 mobile badges

**Given** the user's environment for either type changes (Chrome closes, Maestro disconnects, target URL drops)
**When** the run-status section refreshes (existing 15s poll)
**Then** the dot for the affected check flips to fail with a useful detail string

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-29 | 1.0 | Claude | Created |
| 2026-04-29 | 1.1 | Claude | Implemented. (a) `/api/health` widened to also return `playwright` (plugin existence check at `~/.claude/plugins/.../playwright/`), `chrome` (`ps -A` heuristic for a running Chrome process), and `targetUrl` (curl HEAD against active project's `webUrl` when `projectType:'web'`). (b) Sidebar `Run status` section reads `ACTIVE_PROJECT_CONFIG.projectType` and renders the matching trio (web → Playwright/Chrome/Target URL; mobile → Maestro/Android/iOS); group label includes the type for clarity. (c) Sidebar `nav items` filtered by a per-item `showFor` field — Devices/Maestro/Healing tagged `mobile`, hidden when `projectType==='web'`. (d) Sidebar project pill rebuilt: 4px left border + colored avatar tile + 🌐 WEB / 📱 MOBILE / ⚙ API label in the group header; subtitle line shows `webUrl` for web, `appId` for mobile. (e) Topbar pills mirror the same dispatch: web → Playwright/Chrome/URL; mobile → Maestro/Android/iOS. (f) Test-case kanban cards (`tc-card`) gain a runner badge as the first meta-row pill: `🌐 web` (purple), `📱 mobile` (orange), `⚙ api` (muted). (g) The `t.yaml` "YAML" pill on cards now hides for web projects (it was mobile-flow-specific). Live-verified by swapping projects: morbius (web) shows zero mobile-only chrome; micro-air (mobile) shows zero web chrome. AC1 + AC2 + AC3 met. |
