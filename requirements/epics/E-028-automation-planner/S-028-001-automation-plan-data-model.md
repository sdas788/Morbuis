# Story: Automation Plan Data Model + Persistence

**ID:** S-028-001
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

As a QA lead, I want the automation plan stored as a structured, human-readable artifact per project so that the card↔flow mapping, blockers, and persona context are version-controlled and editable outside the UI.

## Acceptance Criteria

**Given** a project with an automation plan
**When** the server reads it
**Then** each entry resolves a test card to a flow id, an optional blocked reason, and the persona/credential context the flow needs (types defined in `src/types.ts`, read/write in `src/parsers/markdown.ts`)

**Given** a plan is edited
**When** it is written back
**Then** the round-trip preserves structure and is safe to commit (no machine-specific absolute paths leak into the repo)

## Implementation Notes (as built)

`src/types.ts` defines the Automation Planner types (persona registry + plan entries); `src/parsers/markdown.ts` handles persistence. Credential **values** live in per-project `env`, not the plan — the plan references persona keys only.

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-06-10 | 1.0 | Claude | Created — backfilled from shipped code (drift audit). |
