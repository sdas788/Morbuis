# Story: morbius-curate Skill + doctor Checks + Harness Stage

**ID:** S-029-008
**Project:** morbius
**Epic:** E-029
**Stage:** Ready
**Status:** Done
**Priority:** P1
**Version:** 1.0
**Created:** 2026-06-10
**Updated:** 2026-06-10

---

## Story

As a QA lead, I want the curate step encoded as a repeatable harness stage with automated checks so that legibility and honesty are enforced on every new project, not re-discovered by hand each time.

## Acceptance Criteria

**Given** a freshly-synced project
**When** I run the morbius-curate skill
**Then** it walks the `doctor → fix → doctor` loop: quarantine raw/meta epics, reconcile the device matrix, fix shredded titles at the source, confirm the QA Plan layer imported, and surface drift + honest coverage

**Given** `morbius doctor`
**When** it runs
**Then** it reports presentation/legibility checks (junk titles vs `reviewEpics`, device honesty, source drift, plans-imported) and exits clean when the board is curated

**Given** the harness
**When** a project is onboarded
**Then** Curate sits as a defined stage between Onboard and App Map in `requirements/HARNESS.md`

## Implementation Notes (as built)

`.claude/skills/morbius-curate.md`; legibility checks added to the `doctor` command (`src/index.ts`); Curate stage wired into `requirements/HARNESS.md`; SessionStart hook runs `doctor`. Title shredder fixed at the source (`splitACs` / `deriveTitle` in `src/parsers/pmagent.ts`).

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-06-10 | 1.0 | Claude | Created — backfilled from shipped code (drift audit). |
