# Story: Failure Interception Hook in Maestro Runner

**ID:** S-017-001
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

As a developer working on E-017, I want the Maestro runner to detect selector-miss failures and enqueue them for self-healing so that subsequent stories have a clear trigger to work from.

## Acceptance Criteria

**Given** a Maestro flow fails
**When** the failure is parsed from Maestro output
**Then** a classifier determines whether the cause was a selector miss (vs. assertion fail, network fail, app crash)

**Given** a selector miss is detected
**When** the runner finishes
**Then** a `HealingRequest` record is created with: flow path, failed selector, failure line number, runId

**Given** the failure was NOT a selector miss
**When** the runner finishes
**Then** no healing request is created — the failure path is unchanged from today

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
| 2026-04-23 | 1.1 | Claude | Implemented: `HealingProposal` type + `writeHealingProposal/readHealingProposal/loadAllHealingProposals` parsers persisting at `data/{projectId}/healing/proposal-{id}.md`. New `classifySelectorMiss(output, failingStep, errorLine)` matches Maestro signatures `No visible element found / Element not found / Timeout waiting for element` while explicitly excluding `AssertionError` paths. Wired into `/api/test/run`'s child-close handler — on `status==='fail'` we call `enqueueHealingFromFailure()` which writes a proposal in `state: 'requested'` and fires `runHealingPipeline(id)` in the background. Manual trigger also exposed via `POST /api/healing/propose` for testing without a real run. Smoke-tested manual propose: proposal written, pipeline started, advanced to `state: 'error'` cleanly when the snapshot step couldn't reach a device. AC1 + AC2 + AC3 met. |
