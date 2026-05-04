# Story: Browser-Locality Decision (Computer Use vs. Public MCP vs. Hybrid Worker)

**ID:** S-026-002
**Project:** morbius
**Epic:** E-026
**Stage:** Draft
**Status:** Todo
**Priority:** P0
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

---

## Story

As the v2.1 architect, I want a written decision picking ONE of three browser-locality architectures — so S-026-003 has a clear target instead of three competing prototypes. This is the **central architectural question** for v2.1 (Constraint C6 from E-025) and it gets a focused 1-week timebox.

The three options under evaluation:

**(a) Anthropic Computer Use API** — Anthropic exposes a virtual desktop the managed agent drives directly. No Playwright MCP needed; no browser in our infra. Pro: simplest, fully Anthropic-managed. Con: locked to Anthropic's browser; can't pre-load extensions, custom Chrome profiles, or developer tools the way Playwright lets us.

**(b) Public Playwright MCP with auth** — keep our Fly container's Playwright MCP, expose it on a public URL with a bearer token Anthropic forwards from the task definition. Pro: keeps our existing browser automation. Con: adds attack surface (DDoS exposure), requires HTTPS + auth + rate-limiting we don't have today, and Anthropic's egress IPs need allowlisting or it gets noisy.

**(c) Hybrid worker** — managed agent for orchestration (planning, decision-making, result synthesis), a small worker container in our infra for browser actions, communicating over a queue (Redis Streams or SQS). Pro: best of both — Anthropic handles agent reliability, we keep browser locality. Con: more moving parts, queue latency in the agent loop, two failure surfaces.

## Acceptance Criteria

**Given** S-026-001's spike report exists
**When** I author `requirements/decisions/2026-XX-browser-locality.md`
**Then** the doc:
- States the picked option (a, b, or c) in the first paragraph with one-sentence rationale
- For each rejected option, names the specific blocker (cost, latency, attack surface, missing API capability, etc.)
- Sketches the v2.1 runtime topology diagram (boxes + arrows: Morbius API ↔ Managed Agents ↔ browser surface)
- Names the new infra components needed (e.g., for option (c): worker container image, queue, dispatcher)
- Names what stays unchanged from v2.0 (the `src/runners/web-agent.ts` chokepoint signature, the result format, the dashboard UI)

**Given** the decision is recorded
**When** S-026-003 starts
**Then** the implementation has a single architecture target — no second-guessing or A/B testing two options in production

**Given** the chosen option diverges from "Managed Agents direct" (e.g., option (c) is hybrid)
**When** Direction Guardrail #5 (v1.1 from S-025-006) names Managed Agents as the v2.1 target
**Then** I update the direction doc with a v1.2 addendum naming the actual chosen architecture, so future-you reads what shipped, not what was planned

## Constraints (from epic)

- **C1** — browser-locality is non-negotiable. If none of (a), (b), (c) survive evaluation, the decision is "stay on v2.0 indefinitely" and that's a valid (if disappointing) outcome.
- **C5** — direction doc stays current. The decision must round-trip into `wiki/direction-2026-04.md` (or its successor) so the architecture lives in the canonical record.

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-30 | 1.0 | Claude | Created |
