# Claude Agent for Impact Generation

**ID:** S-016-002
**Project:** morbius
**Epic:** E-016
**Stage:** Draft
**Status:** Todo
**Priority:** P0
**Version:** 1.0
**Created:** 2026-04-23
**Updated:** 2026-04-23

---

## Story

As a QA lead, I want an AI agent that takes a bug + its context and produces a structured impact analysis so that I don't have to hand-pick related tests myself after every bug event.

## Acceptance Criteria

**Given** a bug with linked test case, recent run history, and related Maestro YAML
**When** the impact agent is invoked
**Then** it assembles context, calls Claude via the existing `claude --print` bridge, and returns a structured `BugImpact` object

**Given** the Claude call fails (timeout, invalid response)
**When** the failure occurs
**Then** the previous impact file (if any) is preserved and the error is logged; the UI shows a "generation failed, retry" state

**Given** a bug has no linked test case
**When** impact generation is requested
**Then** the agent degrades gracefully — produces Repro Narrative only, flags "limited context" in the frontmatter

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
