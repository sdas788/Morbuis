# Story: YAML Update on Approval + Changelog

**ID:** S-017-006
**Project:** morbius
**Epic:** E-017
**Stage:** Ready
**Status:** Done
**Priority:** P0
**Version:** 1.1
**Created:** 2026-04-23
**Updated:** 2026-04-23

---

## Story

As a QA lead, when I approve a selector proposal, I want the flow YAML updated in-place with a clear changelog entry so that the change is auditable and the flow is ready to run.

## Acceptance Criteria

**Given** a proposal is approved
**When** the YAML update runs
**Then** `src/parsers/maestro-yaml.ts` gains a `replaceSelector(flowPath, old, new)` function that updates exactly the one occurrence and writes the file atomically

**Given** the YAML file had formatting (comments, spacing)
**When** the update runs
**Then** surrounding formatting is preserved (no YAML reflow)

**Given** the update completes
**When** the next run of the flow happens
**Then** it uses the new selector and (if successful) the healing cycle is considered closed — logged in the flow's changelog with reference to the proposal ID

**Given** the file write fails (permissions, disk full)
**When** the failure occurs
**Then** the proposal stays in "approved" state (not "applied") so the user can retry

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
| 2026-04-23 | 1.1 | Claude | Implemented: `replaceSelectorInText(yaml, oldSel, newSel)` (pure string transform — first-occurrence-only, no YAML round-trip so comments + indentation + blank lines are preserved exactly) and `replaceSelector(flowPath, oldSel, newSel)` (file IO wrapper that writes via tempfile + `fs.renameSync` for atomicity) — both live in `src/parsers/maestro-yaml.ts` per the AC's literal request. Unit-tested with three cases: basic single-occurrence replace, not-found returns `{replaced:false}`, comments + blank lines preserved across replacement. Wired into the `POST /api/healing/:id/approve` endpoint: marks proposal `approved` BEFORE the file write so the audit trail shows the user click even on disk failure (AC4); on success transitions to `applied` and appends a row to the test case's changelog noting "self-heal: <old> → <new> (proposal <id>)". On `replaced:false` returns 409 with `preservedState: 'approved'`. AC1 + AC2 + AC3 + AC4 met. |
