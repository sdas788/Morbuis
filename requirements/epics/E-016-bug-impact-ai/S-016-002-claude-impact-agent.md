# Story: Claude Agent for Impact Generation

**ID:** S-016-002
**Project:** morbius
**Epic:** E-016
**Stage:** Ready
**Status:** Done
**Priority:** P0
**Version:** 1.1
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
| 2026-04-23 | 1.1 | Claude | Implemented: server-side `askClaude(prompt, opts)` + `extractJson()` foundation (spawns `claude --print --model claude-sonnet-4-6`, captures stdout, supports timeout — reuses the same bridge as S-006-003 per Guardrail #5). New `generateBugImpact(bugId, projectDir)` function: `buildImpactContext` loads bug + linked test + same-category sibling tests (cap 20) + last 5 runs of the linked test + truncated Maestro YAML; `buildImpactPrompt` composes a strict-JSON instruction with riskScore band guidance; response goes through `extractJson` (handles ```json fences) + `validateRawImpact` (numeric range, array shape, warns on unknown testIds). On any failure (context, Claude timeout, JSON parse, validation) the previous `impact.md` is preserved untouched and the error joins a 10-slot ring buffer (loud `console.error`). New endpoints: `POST /api/bug/:id/impact/generate` and `GET /api/bug/:id/impact`. Live-tested against BUG-001 — Claude returned riskScore 0.72 + 4 rerun + 2 manualVerify + 7-step repro narrative in 9.7s; file written to `data/micro-air/bugs/BUG-001/impact.md` and round-tripped via GET. AC1, AC2, AC3 met (graceful degradation when no linked test is included in the prompt). |
