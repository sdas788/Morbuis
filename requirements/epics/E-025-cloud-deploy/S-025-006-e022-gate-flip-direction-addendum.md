# Story: E-022 Gate Flip + Direction Doc Addendum

**ID:** S-025-006
**Project:** morbius
**Epic:** E-025
**Stage:** Draft
**Status:** Todo
**Priority:** P0
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

---

## Story

As the program lead, I want E-022's gate flipped from "decision-only" to "decided: migrate to Anthropic Managed Agents as v2.1" with the Direction doc Guardrail #5 updated accordingly — so future-me (and any teammate picking up E-026) sees the agreed path rather than re-debating it.

## Acceptance Criteria

**Given** E-022 is currently `Stage: Backlog · Status: Decision-only`
**When** I update its frontmatter and append a Change Log entry
**Then** Status becomes `decided` and the changelog row records: *"2026-04-30 · gate flipped to 'decided: yes, migrate Morbius's web-runner agent path to Anthropic Managed Agents as v2.1 (with Agent SDK as fallback)' per user direction during E-025 planning. Rationale: zero CLI/SDK process management in our infra, Anthropic handles scale/retries/observability."*

**Given** Direction Guardrail #5 in `requirements/wiki/direction-2026-04.md` says *"do NOT pull in Claude Agent SDK or OpenAI SDK until E-022 gate criteria are met"*
**When** I append a v1.1 addendum
**Then** the guardrail is reframed to: *"v2.1 cloud runner targets Anthropic Managed Agents; Claude Agent SDK is the documented fallback if Managed Agents doesn't fit the browser-MCP-locality constraint (see arch.md C6 / E-025 Constraints). CLI subprocess remains the local-laptop default."*

**Given** the new epic E-026 is the home of the Managed Agents migration work
**When** I create `requirements/epics/E-026-managed-agents-migration/E-026.md` with sketched stories
**Then** it appears on the PMAgent board via the existing symlink, with no v2.0 implementation expected

## Constraints (from epic)

- **C6** — the Managed Agents browser-locality problem is the central v2.1 risk. E-022's flip explicitly references it so the spike in E-026 is non-negotiable.

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-30 | 1.0 | Claude | Created |
