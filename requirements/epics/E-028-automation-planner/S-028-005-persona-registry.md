# Story: Persona Registry + Credential Wiring

**ID:** S-028-005
**Project:** morbius
**Epic:** E-028
**Stage:** Ready
**Status:** Done
**Priority:** P2
**Version:** 1.0
**Created:** 2026-06-10
**Updated:** 2026-06-10

---

## Story

As a QA lead, I want named personas (e.g. member, group leader) registered per project so that a flow declares *who* it runs as, while the actual credentials stay out of the plan and out of source control.

## Acceptance Criteria

**Given** a project with registered personas
**When** a flow references a persona
**Then** the persona resolves to credential values held in the per-project `env` (config), never inlined into the committed plan

**Given** the persona registry
**When** `morbius doctor` runs
**Then** persona integrity is checked (count + registration) and reported

## Implementation Notes (as built)

Persona registry types in `src/types.ts` (E-028 block); credential values resolved from `env`; `morbius doctor` reports persona integrity (verified: "4 personas, all registered" on road-scholar-mobile).

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-06-10 | 1.0 | Claude | Created — backfilled from shipped code (drift audit). |
