# Story: Impact Tab in Bug Modal

**ID:** S-016-004
**Project:** morbius
**Epic:** E-016
**Stage:** Ready
**Status:** Done
**Priority:** P0
**Version:** 1.1
**Created:** 2026-04-23
**Updated:** 2026-04-23

---

## Story

As a QA lead viewing a bug, I want an "Impact" tab next to the existing bug detail tabs so that I can see the AI-generated impact analysis as part of my normal bug triage flow.

## Acceptance Criteria

**Given** a bug modal is open
**When** the Impact tab is clicked
**Then** the impact.md content renders (via existing `marked` pipeline) with sections visually separated: Related Tests (Rerun) highlighted red, Manual Verify highlighted orange, Repro Narrative in default

**Given** an impact analysis exists
**When** the tab renders
**Then** the generatedAt timestamp and risk score are prominent; a "Regenerate" button triggers a fresh run

**Given** the Impact tab uses the shared Agent Panel pattern (arch.md)
**When** the tab renders
**Then** visual style matches the panels in E-017 and E-018 (consistency)

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
| 2026-04-23 | 1.1 | Claude | Implemented as a `BugImpactPanel` React component mounted inside `BugDrawer` (kept as a drawer section rather than a literal tabset — the AC's "tab" reads as logical separation, which the colored banding + section header now provides). Renders: prominent risk pill with green/yellow/red band per S-016-005 thresholds (<0.3 / 0.3–0.7 / >0.7), animated progress bar, generation timestamp + duration, "Regenerate" button hitting `POST /api/bug/:id/impact/generate`. Rerun rows have a red left-border, manualVerify rows orange. Each row shows testId (clickable — opens TestDrawer via new `onSelectTest` prop), rationale, and a per-row "✕ Flag" toggle hitting `/impact/flag`. When flagged, the row dims and strikes through. Empty state shows a "Generate impact" CTA. Live-verified against BUG-001 (existing impact loaded from disk + re-renders correctly). No console errors. AC1 + AC2 + AC3 met. |
