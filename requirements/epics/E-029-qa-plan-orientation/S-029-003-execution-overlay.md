# Story: Execution Overlay — Passing Across Planned Stories

**ID:** S-029-003
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

As a QA lead, I want each plan to show how many of its stories actually pass so that I see the truth PMAgent's QA tab can't — "plan exists" vs "plan passes."

## Acceptance Criteria

**Given** a plan that covers a set of `S-NNN-NNN` stories
**When** I view it
**Then** an overlay rolls up Morbius card status for those stories into pass / fail / flaky / not-run, shown per plan and per release (release readiness)

**Given** every story under a release is still "planned" but none pass
**When** I view the release
**Then** the overlay reads honestly (e.g. "0/28 passing") instead of implying completion

## Implementation Notes (as built)

`planExecRollup` + `ExecBar` in `src/server.ts`; plan→storyIds resolved at import; `story` carried on the test-case projection in `loadMorbiusData`. This is the PMAgent-owns-*planned* / Morbius-owns-*passing* alignment loop.

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-06-10 | 1.0 | Claude | Created — backfilled from shipped code (drift audit). |
