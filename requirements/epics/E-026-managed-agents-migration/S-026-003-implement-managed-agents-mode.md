# Story: Implement `runAgentTask({mode:'managed-agents'})` Live

**ID:** S-026-003
**Project:** morbius
**Epic:** E-026
**Stage:** Draft
**Status:** Todo
**Priority:** P1
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

---

## Story

As the v2.1 implementer, I want to flip `src/runners/web-agent.ts`'s `mode: 'managed-agents'` branch from stub-throws to live — using the API shape from S-026-001 and the architecture picked in S-026-002 — so a feature-flagged subset of test runs go through Managed Agents while CLI mode stays the production default until cutover (S-026-004).

## Acceptance Criteria

**Given** S-026-001 (API spike) and S-026-002 (architecture decision) are both done
**When** I implement the `managed-agents` mode in `src/runners/web-agent.ts`
**Then** `runAgentTask({mode:'managed-agents', prompt, mcps, allowedTools, timeoutMs})` returns a `AgentResult` with the same shape as CLI mode — same screenshots, same step log, same pass/fail signal — so the dashboard UI doesn't care which runner produced the result

**Given** the implementation is complete
**When** I run a test case via the dashboard with `MORBIUS_AGENT_MODE=managed-agents` set
**Then** the run executes against the v2.1 architecture, screenshots persist on the volume, run history records the mode, and the result is indistinguishable from a CLI-mode run for the same test case

**Given** the implementation is in production behind the env var
**When** an RF engineer runs the same test case with `mode=cli-subprocess` (default) and `mode=managed-agents` (opt-in)
**Then** both produce passing results within the same time budget (target: managed-agents within 1.2× CLI mode latency)

**Given** Managed Agents returns an error (rate limit, timeout, malformed response)
**When** the runner hits the error
**Then** it fails clearly with a useful message — does NOT silently fall back to CLI mode (that would mask v2.1 reliability issues)

## Constraints (from epic)

- **C2** — CLI mode stays as default. This story does NOT flip the default; that's S-026-004.
- **C3** — no regression on user-visible behavior. The result envelope (screenshots, step log, pass/fail) is identical.
- **C4** — measure per-run cost in production traffic and log it. Decision to cutover (S-026-004) depends on the cost number.

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-30 | 1.0 | Claude | Created |
