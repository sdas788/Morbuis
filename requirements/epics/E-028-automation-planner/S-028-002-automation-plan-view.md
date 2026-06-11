# Story: Automation Plan View (Sidebar Tab)

**ID:** S-028-002
**Project:** morbius
**Epic:** E-028
**Stage:** Ready
**Status:** Done
**Priority:** P1
**Version:** 1.0
**Created:** 2026-06-10
**Updated:** 2026-06-10

---

## Story

As a QA lead, I want a dedicated Automation Plan tab so that I can see every planned flow, its mapped cards, and draft (uncommitted) flows in one place.

## Acceptance Criteria

**Given** a project with draft flows in `data/<project>/flows/*.yaml`
**When** I open the Automation Plan tab
**Then** draft flows are surfaced under an "Automation Plan (drafts)" category alongside committed flows, each showing the cards it maps to

**Given** the plan view
**When** I scan it
**Then** the layout follows the Morbius monochrome design system (status colors only) and links through to the mapped cards

## Implementation Notes (as built)

`AutomationPlanView` component in `src/server.ts`; draft-flow surfacing wired into the Maestro/flow listing; Automation-Planner CSS block in the embedded stylesheet.

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-06-10 | 1.0 | Claude | Created — backfilled from shipped code (drift audit). |
