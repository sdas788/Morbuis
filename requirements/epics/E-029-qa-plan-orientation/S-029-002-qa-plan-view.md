# Story: QA Plan View — Morbius-Native + Progressive Disclosure

**ID:** S-029-002
**Project:** morbius
**Epic:** E-029
**Stage:** Ready
**Status:** Done
**Priority:** P0
**Version:** 1.0
**Created:** 2026-06-10
**Updated:** 2026-06-10

---

## Story

As a QA lead, I want a QA Plan tab that renders the imported plans Morbius-native (not a raw markdown dump) so that the roadmap is scannable and matches the dashboard's look.

## Acceptance Criteria

**Given** imported QA / Flow / Release plans
**When** I open the QA Plan tab
**Then** I see the QA Plan, all Flow Plans (TF-NNN), and Release Plans (TR-NNN) as a navigable list rendered in the Morbius design system (mirroring PMAgent's QA tab)

**Given** a plan with long content
**When** I open its detail
**Then** decision-critical sections (Scope, Journeys, Execution order, Screens, etc.) are split into scannable collapsible section cards rather than one collapsed wall

## Implementation Notes (as built)

`PlansView`, `PlanDetail`, `SectionCard` (3-tier progressive disclosure) in `src/server.ts`; QA Plan sidebar nav item. Replaced the earlier over-collapsed single-toggle detail after a UI/product review.

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-06-10 | 1.0 | Claude | Created — backfilled from shipped code (drift audit). |
