# YAML Update on Approval + Changelog

**ID:** S-017-006
**Project:** morbius
**Epic:** E-017
**Stage:** Draft
**Status:** Todo
**Priority:** P0
**Version:** 1.0
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
