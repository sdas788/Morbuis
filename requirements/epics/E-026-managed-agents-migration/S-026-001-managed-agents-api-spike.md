# Story: Managed Agents API Spike — POST a No-Op Task

**ID:** S-026-001
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

As the v2.1 architect, I want a throwaway script that POSTs a no-op task to Anthropic Managed Agents, polls for completion, and parses the response — so I know the integration shape (auth, request envelope, polling vs. webhook, result schema, error semantics) before committing to a real implementation in `src/runners/web-agent.ts`.

This is a **spike**, not production code. The deliverable is a written report in `requirements/decisions/2026-XX-managed-agents-spike.md` plus a short `scripts/spike/managed-agents-noop.ts` script that can be re-run.

## Acceptance Criteria

**Given** I have the `ANTHROPIC_API_KEY` for Morbius's project and access to Managed Agents API documentation
**When** I run `tsx scripts/spike/managed-agents-noop.ts`
**Then** the script POSTs a "say hello" task with no MCPs attached, polls (or webhooks) for completion, and prints the final result text — proving auth + request shape + completion signaling all work end-to-end

**Given** the spike run completes
**When** I write `requirements/decisions/2026-XX-managed-agents-spike.md`
**Then** the doc covers:
- Auth pattern (API key header? OAuth? scoped token?)
- Task submission envelope (JSON shape, max prompt size, MCP attachment shape if applicable)
- Completion signal (polling endpoint? webhook? SSE stream?)
- Result schema (text, tool calls, errors)
- Error semantics (retries? rate limits? timeouts?)
- Pricing observed (cost of one no-op task, projected cost for a 200-test web suite)
- Open questions blocking the implementation

**Given** the spike report exists
**When** S-026-002 (browser-locality decision) starts
**Then** it can reference this doc for "what Managed Agents can and can't do" without re-running the spike

## Constraints (from epic)

- **C1** — browser-locality is non-negotiable. The spike's no-op task explicitly does NOT involve a browser; that's S-026-002's question. This story is purely about the API shape.
- **C4** — measure cost during spike. The report must include a per-task cost number, even if approximate.

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-30 | 1.0 | Claude | Created |
