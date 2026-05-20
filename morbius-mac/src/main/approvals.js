// E-015 — Approval queue.
// When the agent attempts a permission-gated tool and the permission mode is set to
// `batch`, the call is deferred onto a queue instead of being prompted inline.
// The user reviews the queue in the Approvals view and bulk-approves/denies.
//
// Persistence: ~/Library/Application Support/Morbius/approval-queue.jsonl (append-only)
// Pending items live until resolved. Resolved items get an extra line marking the decision.

const fs = require('fs');
const path = require('path');
const { paths } = require('./paths');

const QUEUE_PATH = path.join(paths?.dataDir || '', 'approval-queue.jsonl');

function ensure() {
  try { fs.mkdirSync(path.dirname(QUEUE_PATH), { recursive: true }); } catch {}
  if (!fs.existsSync(QUEUE_PATH)) fs.writeFileSync(QUEUE_PATH, '');
}
function readAll() {
  ensure();
  const src = fs.readFileSync(QUEUE_PATH, 'utf8');
  const out = [];
  for (const line of src.split('\n')) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch {}
  }
  return out;
}
function append(entry) {
  ensure();
  fs.appendFileSync(QUEUE_PATH, JSON.stringify(entry) + '\n');
}

function enqueue({ tool, args, projectId, conversationId, reasoning }) {
  const id = 'a_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  append({ kind: 'pending', id, tool, args, projectId, conversationId, reasoning, ts: new Date().toISOString() });
  return id;
}

function listPending() {
  const all = readAll();
  const resolved = new Set(all.filter(e => e.kind === 'resolved').map(e => e.id));
  return all.filter(e => e.kind === 'pending' && !resolved.has(e.id));
}

function resolve(id, decision) {
  append({ kind: 'resolved', id, decision, ts: new Date().toISOString() });
}

function registerApprovalHandlers(ipcMain) {
  ipcMain.handle('approvals:list', async () => ({ items: listPending() }));
  ipcMain.handle('approvals:resolve', async (_e, { id, decision }) => {
    resolve(id, decision);
    return { ok: true, decision };
  });
  ipcMain.handle('approvals:clear', async () => {
    fs.writeFileSync(QUEUE_PATH, '');
    return { ok: true };
  });
}

module.exports = { enqueue, listPending, resolve, registerApprovalHandlers, QUEUE_PATH };
