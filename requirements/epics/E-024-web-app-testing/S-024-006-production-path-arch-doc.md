# Story: Production-Path Arch Doc

**ID:** S-024-006
**Project:** morbius
**Epic:** E-024
**Stage:** Ready
**Status:** Done
**Priority:** P2
**Version:** 1.1
**Created:** 2026-04-29
**Updated:** 2026-04-29

---

## Story

As future-me deploying Morbius to production, I want `arch.md` to name the exact swap point and the trajectory from "Claude CLI subprocess" to "Claude Agent SDK" to "Anthropic Managed Agents" so I don't rediscover it.

## Acceptance Criteria

**Given** `requirements/arch.md` is updated
**When** the new "Production Deployment" section renders
**Then** it includes a table mapping today (laptop / CLI subprocess) → tomorrow (containerized server / Claude Agent SDK) → future (multi-tenant scale / Anthropic Managed Agents), each row naming the trigger condition and the exact env var to flip

**Given** the section names the swap point
**When** future-me searches arch.md for "Production Deployment" or "Agent SDK"
**Then** they find a pointer to `src/runners/web-agent.ts` → `runAgentTask()` and a one-line summary of what's commented-stub vs. live

**Given** Direction doc Guardrail #5 ("do NOT pull in Claude Agent SDK until E-022 gate criteria are met")
**When** the section quotes the guardrail
**Then** future-me sees the constraint inline and knows the SDK swap is gated, not free

**Given** the user has flagged open production questions (managed-agents pricing, multi-tenant routing for RF clients, hospital-grade audit trail for Bet C compliance)
**When** the section's "Open Questions" subsection lists them
**Then** they are tracked, not lost

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-29 | 1.0 | Claude | Created |
| 2026-04-29 | 1.1 | Claude | Implemented as part of the S-024-003 commit since the chokepoint and the doc are conceptually a single artifact. New section `## Production Deployment (E-024 / S-024-006)` at `requirements/arch.md:393` includes: (a) mode table with trigger conditions for `cli-subprocess` (live) / `agent-sdk` (commented stub) / `managed-agents` (commented stub), (b) the swap point named verbatim — `src/runners/web-agent.ts → runAgentTask()` — plus the env var to flip (`MORBIUS_AGENT_MODE`), (c) Direction Guardrail #5 quoted in full, (d) "Open Questions" subsection covering pricing model at scale, single-tenant vs multi-tenant for RF clients, and tamper-evident audit-trail requirements for hospital-grade Bet C compliance, (e) the v1 endpoint surface (`POST /api/test/run-web`) and the widened `RunRecord` shape from S-024-002. AC1 + AC2 + AC3 + AC4 met. |
