// E-009 Agent Runtime (mocked — no Anthropic key needed).
// E-013 Conversations + Skills + Memory.
// E-014 QA Loops — /smoke /repro /heal /explore /coverage-gap as deterministic scripts.
// E-015 Safety — kill switch, loop budgets, dry-run.

const fs = require('fs');
const path = require('path');
const { paths } = require('./paths');
const builtinSkills = require('./builtin-skills');

const conversations = new Map(); // id -> { id, title, projectId, messages: [], createdAt }
const activeLoops = new Map();   // convId -> { canceled, budget, used }

function loadConversations(projectId = 'mygrant-glass') {
  const dir = path.join(paths.projectsDir, projectId, 'conversations');
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.jsonl')) continue;
    try {
      const lines = fs.readFileSync(path.join(dir, f), 'utf8').trim().split('\n').filter(Boolean);
      const head = lines.length ? JSON.parse(lines[0]) : {};
      out.push({
        id: f.replace(/\.jsonl$/, ''),
        title: head.title || f,
        ts: head.ts || '',
        projectId,
        messageCount: lines.length,
      });
    } catch {}
  }
  return out.sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));
}

function saveMessage(projectId, convId, msg) {
  const dir = path.join(paths.projectsDir, projectId, 'conversations');
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(path.join(dir, `${convId}.jsonl`), JSON.stringify(msg) + '\n');
}

function pushConv(conv) { conversations.set(conv.id, conv); }

function emit(win, channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

async function callTool(win, projectId, tool, args, callId) {
  // Direct invocation by going through the tool handler's wire path
  // by sending a synthetic event. To keep agent.js self-contained, dispatch
  // by referencing tools.js directly.
  const { invokeTool } = require('./tool-bridge');
  return invokeTool(win, projectId, tool, args, callId);
}

// ---------- Skill scripts ----------
// Each script yields a sequence of { type, ... } steps. They simulate the agent's
// turn: stream text, call tools, stream text, etc. Real Anthropic SDK can replace this.

function* smokeScript() {
  yield { type: 'text', text: "Running the smoke suite. I'll list booted devices, find @smoke flows, run them on each device, classify failures, and file P0 bugs.\n\n" };
  yield { type: 'tool', name: 'listDevices', args: {} };
  yield { type: 'tool', name: 'readTestCase', args: { tag: '@smoke' } };
  yield { type: 'text', text: "Got the device list and the smoke test catalog. Kicking off runs.\n\n" };
  yield { type: 'tool', name: 'runMaestroFlow', args: { flowPath: 'flows/login-happy-path.yaml', deviceId: 'iPhone-15-Pro' } };
  yield { type: 'tool', name: 'runMaestroFlow', args: { flowPath: 'flows/search-product.yaml', deviceId: 'iPhone-SE' } };
  yield { type: 'tool', name: 'runMaestroFlow', args: { flowPath: 'flows/checkout-happy-path.yaml', deviceId: 'iPhone-15-Pro' } };
  yield { type: 'text', text: "**3 runs done** — 2 pass, 1 fail on the checkout flow. Classifying.\n\n" };
  yield { type: 'tool', name: 'classify', args: { runId: 'r-c52a91', output: 'element not found within 8000ms' } };
  yield { type: 'tool', name: 'fileBug', args: { title: 'Order summary missing after checkout', severity: 'P0' } };
  yield { type: 'tool', name: 'publishToPMAgent', args: { target: 'mygrant-glass/QA', items: [{ kind: 'bug' }] } };
  yield { type: 'text', text: "Smoke run complete. **10 pass · 1 fail · 1 flaky**. One P0 bug filed. Summary published to PMAgent QA tab." };
}

function* reproScript(arg) {
  yield { type: 'text', text: `Reproducing **${arg || 'the ticket'}**. Pulling the PMAgent spec, then running against a booted device.\n\n` };
  yield { type: 'tool', name: 'readPMAgentSpec', args: { epicId: arg || 'CH-?' } };
  yield { type: 'tool', name: 'listDevices', args: {} };
  yield { type: 'tool', name: 'runMaestroFlow', args: { flowPath: 'flows/repro.yaml' } };
  yield { type: 'tool', name: 'captureScreenshot', args: { deviceId: 'MOCK-IOS-1' } };
  yield { type: 'tool', name: 'uploadScreenshot', args: { filePath: 'shot.png' } };
  yield { type: 'text', text: 'Repro complete — bug reproduces deterministically. Screenshot attached.' };
}

function* healScript(arg) {
  yield { type: 'text', text: `Healing **${arg || 'the flow'}**. I'll diagnose timing, propose an edit, run 3 verifications.\n\n` };
  yield { type: 'tool', name: 'tailLog', args: { lines: 40 } };
  yield { type: 'tool', name: 'readFile', args: { filePath: path.join(paths.projectsDir, 'mygrant-glass', 'flows', (arg || 'flow') + '.yaml') } };
  yield { type: 'perm-tool', name: 'runShellCommand', args: { cmd: 'adb -s emulator-5554 shell pm clear com.example.app' },
          reasoning: 'Clearing app data gives a deterministic starting state for the verification runs.' };
  yield { type: 'tool', name: 'editFile', args: { filePath: 'placeholder', search: 'tapOn', replace: 'tapOn' } };
  yield { type: 'tool', name: 'runMaestroFlow', args: { flowPath: 'flows/healed.yaml' } };
  yield { type: 'tool', name: 'runMaestroFlow', args: { flowPath: 'flows/healed.yaml' } };
  yield { type: 'tool', name: 'runMaestroFlow', args: { flowPath: 'flows/healed.yaml' } };
  yield { type: 'tool', name: 'commitToGithub', args: { message: 'heal flow', files: ['flows/healed.yaml'] } };
  yield { type: 'text', text: 'Heal complete — flow stabilized across 3 verification runs. Committed.' };
}

function* exploreScript(arg) {
  yield { type: 'text', text: `Exploring **${arg || 'screen'}**. Tapping affordances and snapshotting anomalies.\n\n` };
  yield { type: 'tool', name: 'listDevices', args: {} };
  yield { type: 'tool', name: 'runMaestroFlow', args: { flowPath: 'flows/explore.yaml' } };
  yield { type: 'tool', name: 'captureScreenshot', args: { deviceId: 'MOCK-IOS-1' } };
  yield { type: 'text', text: 'Exploration complete — 1 screenshot captured, no anomalies.' };
}

function* coverageGapScript() {
  yield { type: 'text', text: 'Comparing PMAgent spec against existing test cases to surface untested user paths.\n\n' };
  yield { type: 'tool', name: 'readPMAgentSpec', args: {} };
  yield { type: 'tool', name: 'readTestCase', args: { tag: 'all' } };
  yield { type: 'text', text: 'Found **3 untested paths**: forgot-password, deep-link from email, edge-case on cart limit. Want me to draft test cases?' };
}

function* freeFormReply(text) {
  yield { type: 'text', text: `I'm running in local mode (no Anthropic key configured). I parsed your message:\n\n> ${text}\n\n` };
  yield { type: 'text', text: 'Try one of the built-in skills:\n\n- `/smoke` — run smoke suite\n- `/repro CH-1234` — reproduce a ticket\n- `/heal flow-name` — self-heal a flaky flow\n- `/explore screen` — exploratory testing\n- `/coverage-gap` — find untested paths' };
}

function pickScript(message) {
  const t = (message || '').trim();
  if (t.startsWith('/smoke')) return smokeScript();
  if (t.startsWith('/repro')) return reproScript(t.slice(6).trim());
  if (t.startsWith('/heal'))  return healScript(t.slice(5).trim());
  if (t.startsWith('/explore')) return exploreScript(t.slice(8).trim());
  if (t.startsWith('/coverage-gap')) return coverageGapScript();
  return freeFormReply(t);
}

async function runScript(win, conv, gen, opts = {}) {
  const projectId = conv.projectId || 'mygrant-glass';
  const loop = { canceled: false, used: { calls: 0, costUSD: 0 }, budget: opts.budget || { calls: 30, costUSD: 2.0 } };
  activeLoops.set(conv.id, loop);

  // Accumulators for persistence
  let buf = '';
  const tools = [];

  for (const step of gen) {
    if (loop.canceled) {
      emit(win, 'agent:stream', { conversationId: conv.id, delta: '\n\n_Halted by user._', done: false, kind: 'system' });
      saveMessage(projectId, conv.id, { role: 'system', ts: new Date().toISOString(), kind: 'halted' });
      break;
    }
    if (loop.used.calls >= loop.budget.calls) {
      emit(win, 'agent:stream', { conversationId: conv.id, delta: '\n\n_Loop budget reached. Stopping._', done: false, kind: 'system' });
      saveMessage(projectId, conv.id, { role: 'system', ts: new Date().toISOString(), kind: 'budget-exceeded' });
      break;
    }
    if (step.type === 'text') {
      buf += step.text;
      for (const piece of chunk(step.text, 24)) {
        if (loop.canceled) break;
        await sleep(28);
        emit(win, 'agent:stream', { conversationId: conv.id, delta: piece, done: false, kind: 'text' });
      }
    } else if (step.type === 'tool' || step.type === 'perm-tool') {
      const callId = `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const toolEntry = { callId, toolName: step.name, args: step.args || {}, status: 'running' };
      tools.push(toolEntry);
      emit(win, 'agent:tool_call', { conversationId: conv.id, callId, toolName: step.name, args: step.args });
      const res = await callTool(win, projectId, step.name, step.args || {}, callId);
      loop.used.calls += 1;
      loop.used.costUSD += 0.02;
      toolEntry.status = res?.status || (res?.ok ? 'pass' : 'fail');
      toolEntry.durationMs = res?.durationMs || 0;
      emit(win, 'agent:tool_result', { callId, status: toolEntry.status,
                                         output: res?.result, durationMs: toolEntry.durationMs });
      emit(win, 'loop:budget', { used: loop.used, budget: loop.budget });
      await sleep(180);
    }
  }
  emit(win, 'agent:stream', { conversationId: conv.id, delta: '', done: true, kind: 'text' });
  // Persist the full assistant turn — text + tool calls — so reopen works.
  saveMessage(projectId, conv.id, {
    role: 'assistant',
    ts: new Date().toISOString(),
    text: buf,
    tools,
  });
  activeLoops.delete(conv.id);
}

function chunk(s, n) {
  const out = [];
  for (let i = 0; i < s.length; i += n) out.push(s.slice(i, i + n));
  return out;
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function registerAgentHandlers(ipcMain, getWin) {
  // Lazy-load the real SDK module so missing dep doesn't break boot
  let anthropicAgent = null;
  try { anthropicAgent = require('./agent-anthropic'); } catch (e) { console.warn('Anthropic SDK not available:', e.message); }

  ipcMain.handle('agent:send', async (_e, { conversationId, text, projectId = 'mygrant-glass' }) => {
    const win = getWin();
    let conv = conversations.get(conversationId);
    if (!conv) {
      conv = {
        id: conversationId || ('conv-' + Date.now()),
        title: text.length > 60 ? text.slice(0, 60) + '…' : text,
        projectId,
        messages: [],
        createdAt: new Date().toISOString(),
      };
      pushConv(conv);
      saveMessage(projectId, conv.id, { role: 'system', ts: conv.createdAt, kind: 'init', title: conv.title });
    }
    saveMessage(projectId, conv.id, { role: 'user', ts: new Date().toISOString(), text });

    // E-009 dispatcher: real Anthropic SDK if a key is configured, else deterministic script.
    const useReal = anthropicAgent && anthropicAgent.hasRealKey();
    if (useReal) {
      anthropicAgent.runAgentTurn({ win, conv, userText: text, projectId })
        .then((result) => {
          // Persist the full assistant turn
          saveMessage(projectId, conv.id, {
            role: 'assistant',
            ts: new Date().toISOString(),
            text: result.text || '',
            tools: result.tools || [],
            usage: result.used || {},
          });
        })
        .catch((err) => {
          emit(win, 'agent:stream', { conversationId: conv.id, delta: `\n\n_Agent error: ${err}_`, done: true, kind: 'error' });
        });
    } else {
      runScript(win, conv, pickScript(text)).catch(err =>
        emit(win, 'agent:stream', { conversationId: conv.id, delta: `\n\n_Agent error: ${err}_`, done: true, kind: 'error' })
      );
    }
    return { ok: true, conversationId: conv.id, mode: useReal ? 'anthropic' : 'mock' };
  });

  ipcMain.handle('agent:mode', async () => {
    return { mode: (anthropicAgent && anthropicAgent.hasRealKey()) ? 'anthropic' : 'mock' };
  });

  ipcMain.handle('agent:cancel', async (_e, { conversationId }) => {
    const loop = activeLoops.get(conversationId);
    if (loop) loop.canceled = true;
    if (anthropicAgent) anthropicAgent.cancelLoop(conversationId);
    return { ok: true };
  });

  ipcMain.handle('conversation:list', async (_e, { projectId = 'mygrant-glass' } = {}) =>
    ({ conversations: loadConversations(projectId) }));

  ipcMain.handle('conversation:open', async (_e, { projectId = 'mygrant-glass', id }) => {
    const f = path.join(paths.projectsDir, projectId, 'conversations', `${id}.jsonl`);
    if (!fs.existsSync(f)) return { messages: [] };
    const lines = fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean);
    return { messages: lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) };
  });

  ipcMain.handle('skill:list', async () => ({ skills: builtinSkills }));

  ipcMain.handle('memory:read', async () => {
    const f = path.join(paths.memoryDir, 'MEMORY.md');
    return { contents: fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '' };
  });
  ipcMain.handle('memory:write', async (_e, { contents }) => {
    fs.writeFileSync(path.join(paths.memoryDir, 'MEMORY.md'), contents || '');
    return { ok: true };
  });

  ipcMain.handle('safety:kill', async () => {
    let n = 0;
    for (const [convId, loop] of activeLoops) { loop.canceled = true; n += 1; if (anthropicAgent) anthropicAgent.cancelLoop(convId); }
    return { ok: true, halted: n };
  });
  ipcMain.handle('safety:set-budget', async (_e, { budget }) => {
    return { ok: true, budget }; // applied per-loop on the next run
  });
}

module.exports = { registerAgentHandlers };
