// E-024 / S-024-003: Single chokepoint for every agent-driven test run.
//
// Production trajectory (also documented in requirements/arch.md "Production Deployment"):
//   today    → cli-subprocess     spawns `claude --print` (this file's only live impl)
//   tomorrow → agent-sdk          uses @anthropic-ai/claude-agent-sdk (commented stub)
//   future   → managed-agents     posts task to Anthropic's hosted runtime (commented stub)
//
// Direction doc Guardrail #5 (`requirements/wiki/direction-2026-04.md`) explicitly says:
//   "Agents use existing Claude Code bridge. Do NOT pull in Claude Agent SDK or
//    OpenAI SDK until E-022 gate criteria are met."
// So the SDK + Managed Agents paths are commented stubs that throw until the gate
// flips. The chokepoint is intentionally a single function so the swap is small.

import { spawn, type ChildProcess } from 'node:child_process';

export type AgentMode = 'cli-subprocess' | 'agent-sdk' | 'managed-agents';
export type BrowserBackend = 'playwright-mcp' | 'claude-in-chrome' | 'maestro-mcp';

// Map a logical browser backend to the tool-name patterns the Claude CLI's
// --allowed-tools flag understands. If the user's MCP server is registered under
// a different name, callers can pass an explicit `allowedTools` to override.
const MCP_TOOL_PATTERNS: Record<BrowserBackend, string[]> = {
  'playwright-mcp':    ['mcp__playwright__*'],
  'claude-in-chrome':  ['mcp__Claude_in_Chrome__*'],
  'maestro-mcp':       ['mcp__maestro__*'],
};

export interface AgentTaskOpts {
  mode?: AgentMode;            // default 'cli-subprocess'
  prompt: string;
  mcps?: BrowserBackend[];     // logical backends; resolved to --allowed-tools
  allowedTools?: string[];     // explicit override (skips the mcps→tools mapping)
  timeoutMs?: number;          // default 5 minutes
  cwd?: string;
  model?: string;              // default claude-sonnet-4-6
  bare?: boolean;              // pass --bare for clean test runs. WARNING: --bare disables
                               // OAuth/keychain auth — set ANTHROPIC_API_KEY env or accept
                               // "Not logged in" errors. Default false (use the user's
                               // existing Claude Code session, same as askClaude/E-016).
}

export interface AgentResult {
  ok: boolean;
  text: string;                // full stdout
  json?: unknown;              // best-effort: parses --output-format json wrapper, then any JSON in the agent's reply
  durationMs: number;
  error?: string;
  exitCode?: number | null;
}

export async function runAgentTask(opts: AgentTaskOpts): Promise<AgentResult> {
  const mode = opts.mode ?? 'cli-subprocess';

  if (mode === 'agent-sdk') {
    // Future swap point. Pseudocode:
    //   import { ClaudeAgent } from '@anthropic-ai/claude-agent-sdk';
    //   const agent = new ClaudeAgent({ model: opts.model, mcpServers: resolveMcps(opts.mcps) });
    //   const r = await agent.run({ prompt: opts.prompt, timeoutMs: opts.timeoutMs });
    //   return { ok: !r.error, text: r.text ?? '', json: r.parsed, durationMs: r.durationMs, error: r.error };
    // Gated on E-022 outcome — see arch.md "Production Deployment".
    throw new Error(
      "Claude Agent SDK mode not enabled in v1 — gated on E-022 per Direction Guardrail #5. " +
      "See requirements/arch.md → Production Deployment for the swap procedure."
    );
  }

  if (mode === 'managed-agents') {
    // Future swap point. Pseudocode:
    //   const r = await fetch('https://api.anthropic.com/v1/agents/<agent_id>/run', {
    //     method: 'POST', headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY!, ... },
    //     body: JSON.stringify({ prompt: opts.prompt, mcps: opts.mcps, ... }),
    //   });
    // Gated on E-022 outcome AND on Anthropic Managed Agents reaching GA.
    throw new Error(
      "Anthropic Managed Agents mode not enabled in v1 — see requirements/arch.md → Production Deployment."
    );
  }

  return runViaCli(opts);
}

// Single live implementation: shells out to the user's installed Claude CLI.
// Mirrors the pattern that S-006-003 (chat bridge) and E-016 (askClaude) already use.
async function runViaCli(opts: AgentTaskOpts): Promise<AgentResult> {
  const t0 = Date.now();
  const model = opts.model ?? 'claude-sonnet-4-6';
  const timeoutMs = opts.timeoutMs ?? 5 * 60 * 1000;

  // Resolve allowedTools: explicit override > mapping from `mcps` > none
  const allowedTools = opts.allowedTools ??
    (opts.mcps ?? []).flatMap((m): string[] => MCP_TOOL_PATTERNS[m] ?? []);

  // Visual debug mode is enabled when the caller asks for the in-Chrome backend.
  // Headless mode keeps `--no-chrome` so the run is deterministic regardless of any
  // Chrome session state.
  const visual = (opts.mcps ?? []).includes('claude-in-chrome');

  const args: string[] = ['--print', '--model', model];
  if (opts.bare) args.push('--bare');
  args.push(visual ? '--chrome' : '--no-chrome');
  args.push('--output-format', 'json');
  if (allowedTools.length > 0) {
    args.push('--allowed-tools', ...allowedTools);
  }
  // Permission mode: Morbius is running unattended, so disallow blocking prompts.
  // 'auto' = auto-approve safe operations, ask only on dangerous ones (still blocking
  // — but since stdin is closed, the agent will fail rather than hang).
  args.push('--permission-mode', 'auto');
  args.push(opts.prompt);

  return new Promise<AgentResult>((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    const settle = (r: AgentResult): void => {
      if (settled) return;
      settled = true;
      resolve(r);
    };

    let child: ChildProcess;
    try {
      child = spawn('claude', args, {
        cwd: opts.cwd ?? process.cwd(),
        env: { ...process.env, FORCE_COLOR: '0' },
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return settle({ ok: false, text: '', durationMs: Date.now() - t0, error: 'spawn failed: ' + msg });
    }

    child.stdin?.end();

    const to = setTimeout(() => {
      child.kill('SIGTERM');
      settle({ ok: false, text: stdout, durationMs: Date.now() - t0, error: 'timeout after ' + timeoutMs + 'ms' });
    }, timeoutMs);

    child.stdout?.on('data', (b: Buffer) => { stdout += b.toString(); });
    child.stderr?.on('data', (b: Buffer) => { stderr += b.toString(); });

    child.on('close', (code) => {
      clearTimeout(to);
      const durationMs = Date.now() - t0;
      const exitCode = code;

      if (code !== 0 || !stdout.trim()) {
        return settle({
          ok: false,
          text: stdout,
          durationMs,
          exitCode,
          error: 'claude exit ' + code + (stderr ? ' — ' + stderr.slice(0, 400) : ''),
        });
      }

      // --output-format json gives a wrapper object (typically { result: "...", session_id, cost_usd, ... }).
      // The agent's actual reply lives in `result`; if that reply contains a fenced
      // ```json``` block (the prompt usually asks for one), extract + parse it as `json`.
      let outerJson: unknown;
      try { outerJson = JSON.parse(stdout); } catch { /* outer wasn't valid JSON */ }

      let agentJson: unknown;
      if (outerJson && typeof outerJson === 'object' && 'result' in outerJson) {
        const result = (outerJson as { result?: unknown }).result;
        if (typeof result === 'string') {
          const fence = result.match(/```(?:json)?\s*([\s\S]*?)```/);
          const candidate = fence ? fence[1] : result;
          // Also scan for first {...} or [...] block as fallback
          const objMatch = candidate.match(/\{[\s\S]*\}/);
          const arrMatch = candidate.match(/\[[\s\S]*\]/);
          const tryParse = (s: string | undefined) => {
            if (!s) return undefined;
            try { return JSON.parse(s); } catch { return undefined; }
          };
          agentJson = tryParse(candidate.trim()) ?? tryParse(objMatch?.[0]) ?? tryParse(arrMatch?.[0]);
        }
      }

      settle({
        ok: true,
        text: stdout,
        json: agentJson ?? outerJson,
        durationMs,
        exitCode,
      });
    });

    child.on('error', (err) => {
      clearTimeout(to);
      settle({ ok: false, text: stdout, durationMs: Date.now() - t0, error: err.message });
    });
  });
}
