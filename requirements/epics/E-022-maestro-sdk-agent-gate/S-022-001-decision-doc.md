# Write Decision Doc + Gate Criteria

**ID:** S-022-001
**Project:** morbius
**Epic:** E-022
**Stage:** Draft
**Status:** Todo (DECISION-ONLY)
**Priority:** P4
**Version:** 1.0
**Created:** 2026-04-23
**Updated:** 2026-04-23

---

## ⚠ Decision-only, no build

This story produces a written decision doc. It does NOT ship code. If you find yourself writing code for this story, stop and re-read E-022.

---

## Story

As a maintainer of Morbius's direction, I want a written decision doc explaining why we are NOT (currently) rebuilding our Maestro skills as a standalone Claude/OpenAI SDK agent so that future-us (or another contributor) knows the reasoning and the gate criteria for changing the decision.

## Acceptance Criteria

**Given** the decision doc is written
**When** it is reviewed
**Then** it covers: current state (Maestro MCP skills inside Claude Code), proposed alternative (standalone SDK agent), cost estimate, risk, and the explicit gate criteria for reversing the decision

**Given** any of the gate criteria later becomes true
**When** a future session revisits this story
**Then** they have enough context to either (a) keep the gate closed with updated reasoning, or (b) open the gate and spawn a new build epic

**Given** the decision doc lives at `requirements/decisions/maestro-sdk-agent-gate.md`
**When** written
**Then** it is mirrored to both `/Users/sdas/PMAgent/projects/morbius/` and `/Users/sdas/Morbius/requirements/`

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
