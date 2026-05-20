// E-009 — Real Anthropic Agent SDK loop.
// Activated when ANTHROPIC_API_KEY env or ~/.morbius/.anthropic_key sidecar exists.
// Falls back to the deterministic loop in agent.js when no key is configured.

const fs = require('fs');
const path = require('path');
const os = require('os');
const Anthropic = require('@anthropic-ai/sdk');
const { paths } = require('./paths');
const { invokeTool } = require('./tool-bridge');
const { getToolSchemas, getSystemPrefix } = require('./tool-schemas');

// Per-1M token pricing (rough — adjust as Anthropic publishes updates).
// Used to compute E-012's per-call cost footer.
const PRICING = {
  'claude-opus-4-7':     { in: 15.00 / 1_000_000, out: 75.00 / 1_000_000 },
  'claude-sonnet-4-6':   { in:  3.00 / 1_000_000, out: 15.00 / 1_000_000 },
  'claude-haiku-4-5':    { in:  1.00 / 1_000_000, out:  5.00 / 1_000_000 },
};
const DEFAULT_MODEL = 'claude-sonnet-4-6';

function loadApiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY.trim();
  const sidecar = path.join(os.homedir(), '.morbius', '.anthropic_key');
  if (fs.existsSync(sidecar)) {
    try { return fs.readFileSync(sidecar, 'utf8').trim(); } catch { return null; }
  }
  return null;
}

function hasRealKey() { return !!loadApiKey(); }

// Load a skill markdown body so a /skill invocation can ground the system prompt.
function loadSkillBody(slash) {
  const name = slash.replace(/^\//, '').split(/\s/)[0];
  const f = path.join(paths.skillsDir, name + '.md');
  if (!fs.existsSync(f)) return null;
  try {
    const src = fs.readFileSync(f, 'utf8');
    // Drop frontmatter — keep body
    const end = src.indexOf('\n---', 3);
    return end > 0 ? src.slice(end + 4).trim() : src.trim();
  } catch { return null; }
}

function readConversationHistory(projectId, convId) {
  const f = path.join(paths.projectsDir, projectId, 'conversations', convId + '.jsonl');
  if (!fs.existsSync(f)) return [];
  const lines = fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean);
  const msgs = [];
  for (const line of lines) {
    try {
      const j = JSON.parse(line);
      if (j.role === 'user') msgs.push({ role: 'user', content: j.text || '' });
      else if (j.role === 'assistant' && j.text) msgs.push({ role: 'assistant', content: j.text });
    } catch {}
  }
  return msgs;
}

// Active loops keyed by conversationId so the kill switch can cancel them.
const activeLoops = new Map();
function cancelLoop(conversationId) {
  const loop = activeLoops.get(conversationId);
  if (loop) loop.canceled = true;
}

async function runAgentTurn({ win, conv, userText, projectId, opts = {} }) {
  const apiKey = loadApiKey();
  if (!apiKey) throw new Error('No Anthropic API key configured');

  const client = new Anthropic({ apiKey });
  const model = opts.model || process.env.MORBIUS_MODEL || DEFAULT_MODEL;
  const tools = getToolSchemas();

  // System prompt: base persona + skill body if a slash was used
  const systemParts = [getSystemPrefix({ projectId, project: conv.title })];
  const slashMatch = userText.match(/^(\/\w[\w-]*)/);
  if (slashMatch) {
    const body = loadSkillBody(slashMatch[1]);
    if (body) systemParts.push('### Active skill: ' + slashMatch[1] + '\n\n' + body);
  }
  const system = systemParts.join('\n\n---\n\n');

  // Conversation history (user/assistant only — tool results are turn-scoped)
  const messages = readConversationHistory(projectId, conv.id);
  messages.push({ role: 'user', content: userText });

  // Loop budget — closes E-015
  const budget = opts.budget || { calls: 40, costUSD: 2.0 };
  const loop = { canceled: false, used: { calls: 0, costUSD: 0, tokensIn: 0, tokensOut: 0 } };
  activeLoops.set(conv.id, loop);

  const emit = (channel, payload) => {
    if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
  };

  // Cumulative streamed text for UI persistence + per-iteration text for context fidelity
  let assistantText = '';
  const assistantTools = [];

  try {
    let iter = 0;
    while (iter < budget.calls) {
      iter += 1;
      if (loop.canceled) break;
      if (loop.used.costUSD >= budget.costUSD) {
        emit('agent:stream', { conversationId: conv.id, delta: '\n\n_Loop budget reached. Stopping._', done: false, kind: 'system' });
        break;
      }

      let stopReason = null;
      let currentBlock = null;
      let toolUseAccumulator = null;
      const turnToolUses = [];
      let iterationText = ''; // text generated in THIS iteration (for context fidelity)

      const stream = client.messages.stream({
        model,
        max_tokens: 4096,
        system,
        messages,
        tools,
      });

      for await (const event of stream) {
        if (loop.canceled) break;
        if (event.type === 'content_block_start') {
          currentBlock = event.content_block;
          if (currentBlock.type === 'tool_use') {
            toolUseAccumulator = { id: currentBlock.id, name: currentBlock.name, input: '' };
          }
        } else if (event.type === 'content_block_delta') {
          const d = event.delta;
          if (d.type === 'text_delta') {
            assistantText += d.text;
            iterationText += d.text;
            emit('agent:stream', { conversationId: conv.id, delta: d.text, done: false, kind: 'text' });
          } else if (d.type === 'input_json_delta' && toolUseAccumulator) {
            toolUseAccumulator.input += d.partial_json || '';
          }
        } else if (event.type === 'content_block_stop') {
          if (toolUseAccumulator) {
            let parsedInput = {};
            try { parsedInput = toolUseAccumulator.input ? JSON.parse(toolUseAccumulator.input) : {}; }
            catch (e) { parsedInput = {}; }
            turnToolUses.push({ id: toolUseAccumulator.id, name: toolUseAccumulator.name, input: parsedInput });
            toolUseAccumulator = null;
          }
          currentBlock = null;
        } else if (event.type === 'message_delta') {
          if (event.delta?.stop_reason) stopReason = event.delta.stop_reason;
          if (event.usage) {
            const p = PRICING[model] || PRICING[DEFAULT_MODEL];
            const ti = event.usage.input_tokens || 0;
            const to = event.usage.output_tokens || 0;
            const prevCost = loop.used.costUSD;
            loop.used.tokensIn += ti;
            loop.used.tokensOut += to;
            loop.used.costUSD += ti * p.in + to * p.out;
            emit('loop:budget', { used: loop.used, budget, skill: slashMatch ? slashMatch[1] : null });
            // E-015 budget-warn at 80% and 95% — fire once per threshold
            const pctOf = (loop.used.costUSD / budget.costUSD);
            const prevPct = (prevCost / budget.costUSD);
            if (prevPct < 0.80 && pctOf >= 0.80) emit('loop:budget-warn', { level: 'warn', pct: Math.round(pctOf * 100), used: loop.used, budget });
            if (prevPct < 0.95 && pctOf >= 0.95) emit('loop:budget-warn', { level: 'danger', pct: Math.round(pctOf * 100), used: loop.used, budget });
          }
        }
      }

      // Build the full assistant message (text + tool_use blocks) for next-turn context.
      // The Anthropic API requires that tool_result messages reference an assistant message
      // that contains the corresponding tool_use blocks.
      const assistantBlocks = [];
      if (iterationText) assistantBlocks.push({ type: 'text', text: iterationText });
      for (const tu of turnToolUses) {
        assistantBlocks.push({ type: 'tool_use', id: tu.id, name: tu.name, input: tu.input });
      }
      if (assistantBlocks.length === 0) break; // model said nothing — end loop
      messages.push({ role: 'assistant', content: assistantBlocks });

      if (turnToolUses.length === 0) break; // no tool_use → final response, exit

      // Execute tool calls (gated by permission chokepoint), append tool_result blocks
      const toolResultBlocks = [];
      for (const tu of turnToolUses) {
        if (loop.canceled) break;
        const callId = 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        emit('agent:tool_call', { conversationId: conv.id, callId, toolName: tu.name, args: tu.input });
        assistantTools.push({ callId, toolName: tu.name, args: tu.input, status: 'running' });
        let res;
        try {
          res = await invokeTool(win, projectId, tu.name, tu.input || {}, callId);
        } catch (e) {
          res = { ok: false, status: 'fail', error: String(e) };
        }
        loop.used.calls += 1;
        const finalStatus = res?.status || (res?.ok ? 'pass' : 'fail');
        const stored = assistantTools.find(t => t.callId === callId);
        if (stored) { stored.status = finalStatus; stored.durationMs = res?.durationMs || 0; }
        emit('agent:tool_result', { callId, status: finalStatus, output: res?.result, durationMs: res?.durationMs || 0 });
        toolResultBlocks.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: JSON.stringify(res?.result ?? res ?? null).slice(0, 8000),
          is_error: finalStatus === 'fail' || finalStatus === 'denied',
        });
      }
      messages.push({ role: 'user', content: toolResultBlocks });

      if (stopReason && stopReason !== 'tool_use') break;
    }
  } catch (e) {
    emit('agent:stream', {
      conversationId: conv.id,
      delta: '\n\n_Anthropic SDK error: ' + (e?.message || String(e)) + '_',
      done: false, kind: 'error',
    });
  }

  emit('agent:stream', { conversationId: conv.id, delta: '', done: true, kind: 'text' });
  activeLoops.delete(conv.id);
  return { text: assistantText, tools: assistantTools, used: loop.used };
}

module.exports = { hasRealKey, runAgentTurn, cancelLoop };
