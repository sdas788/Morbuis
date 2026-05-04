# Story: `runAgentTask` Chokepoint + Production-Path Stub

**ID:** S-024-003
**Project:** morbius
**Epic:** E-024
**Stage:** Ready
**Status:** Done
**Priority:** P0
**Version:** 1.1
**Created:** 2026-04-29
**Updated:** 2026-04-29

---

## Story

As the architect of the production trajectory, I want every agent-driven test run to flow through a single function (`runAgentTask`) so the eventual swap from CLI subprocess → Claude Agent SDK → Anthropic Managed Agents is a one-file change, not a refactor.

## Acceptance Criteria

**Given** the new module `src/runners/web-agent.ts` exports `runAgentTask({mode, prompt, mcps, timeoutMs}): Promise<AgentResult>`
**When** v1 callers invoke it with `mode: 'cli-subprocess'` (default)
**Then** the function spawns `claude --print --model claude-sonnet-4-6` with the requested MCP allowlist, captures stdout, optionally JSON-parses via `extractJson`, and returns `{ok, text, json?, durationMs, error?}`

**Given** a caller sets `mode: 'agent-sdk'` or `mode: 'managed-agents'`
**When** invoked
**Then** the function throws a clear "not enabled — see arch.md Production Deployment" error (commented stub showing the future call shape stays in source for the eventual swap)

**Given** Direction Guardrail #5 ("do NOT pull in Claude Agent SDK until E-022 gate criteria are met")
**When** v1 ships
**Then** no `@anthropic-ai/claude-agent-sdk` dependency is added to `package.json` and the chokepoint is documented as the single swap point

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-29 | 1.0 | Claude | Created |
| 2026-04-29 | 1.1 | Claude | Implemented `src/runners/web-agent.ts` exporting `runAgentTask({mode, prompt, mcps, allowedTools, timeoutMs, model, bare})` → `Promise<AgentResult>`. v1 live mode `cli-subprocess`: spawns `claude --print --model claude-sonnet-4-6 --no-chrome --output-format json [--allowed-tools <patterns>] --permission-mode auto <prompt>`. The `mcps: BrowserBackend[]` option (`'playwright-mcp' \| 'claude-in-chrome' \| 'maestro-mcp'`) maps to MCP tool patterns (`mcp__playwright__* / mcp__Claude_in_Chrome__* / mcp__maestro__*`); explicit `allowedTools` overrides the mapping. Visual mode (mcps includes `claude-in-chrome`) flips to `--chrome`; otherwise `--no-chrome` for deterministic runs. Output handling: parses the CLI's `--output-format json` wrapper, then extracts the first ```json fenced block (or first `{...}`/`[...]`) from the agent's `result` string into `AgentResult.json` via best-effort parsing. `agent-sdk` and `managed-agents` modes are commented stubs that throw with a pointer to arch.md → "Production Deployment". Three smoke tests live: (a) `mode:'agent-sdk'` throws, (b) `mode:'managed-agents'` throws, (c) `mode:'cli-subprocess'` with a "reply with JSON" prompt returned `{"ok":true,"msg":"hello from chokepoint"}` in 2.7s. Side-fix: documented the `--bare` flag's auth gotcha (disables OAuth keychain → needs `ANTHROPIC_API_KEY`); default is `bare:false` so the runner uses the user's existing Claude Code session like `askClaude` does. Direction Guardrail #5 verbatim copy added to `requirements/arch.md` "Production Deployment" section. AC1 + AC2 + AC3 met. |
