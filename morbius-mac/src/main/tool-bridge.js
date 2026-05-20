// In-process invocation of agent tools — used by agent.js so its tool calls
// still go through permission + activity logging without touching IPC.

const fs = require('fs');
const path = require('path');
const { paths } = require('./paths');

// Re-export a callable that mirrors what tools.js does on 'tool:call'.
// Implemented by loading tools.js once and reading its private impls. To avoid
// circular requires we duplicate the dispatch glue here, calling into the same
// implementations exposed for testing.

const toolsModule = require('./tools');
const mcp = require('./mcp');

async function invokeTool(win, projectId, tool, args, callId) {
  const { _impls, _checkPermission, _logActivity, _appendAudit, _toolCategory } = getInternals();

  const id = callId || `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  _logActivity(win, projectId, { callId: id, tool, args, status: 'running' });

  // MCP tools: treat as 'unknown' category → prompt by default (safe stance for third-party tools)
  const isMcp = mcp.isMcpTool(tool);
  let decision = 'allow';
  if (isMcp || _toolCategory(tool) !== 'read') {
    const reason = isMcp ? 'MCP-provided tool — origin: ' + tool.split('__')[1] : '';
    const r = await _checkPermission(win, tool, args, reason);
    decision = r.decision;
  }
  if (decision === 'dryRun') {
    // E-015: simulate a successful side-effect without executing
    const dryResult = { ok: true, dryRun: true, wouldCall: tool, withArgs: args };
    _logActivity(win, projectId, { callId: id, tool, args, status: 'pass', durationMs: 0, result: dryResult, dryRun: true });
    _appendAudit({ tool, args, decision: 'dry-run' });
    return { ok: true, callId: id, durationMs: 0, result: dryResult, status: 'pass' };
  }
  if (decision !== 'allow') {
    _logActivity(win, projectId, { callId: id, tool, args, status: 'denied' });
    _appendAudit({ tool, args, decision: 'deny' });
    return { ok: false, denied: true, callId: id, status: 'denied' };
  }

  const start = Date.now();
  let result;
  try {
    if (isMcp) {
      result = await mcp.invokeMcpTool(tool, args || {});
    } else {
      const impl = _impls[tool];
      if (!impl) {
        _logActivity(win, projectId, { callId: id, tool, args, status: 'fail', error: 'unknown tool' });
        return { ok: false, error: 'unknown tool', callId: id, status: 'fail' };
      }
      result = await impl(args || {});
    }
  } catch (e) {
    result = { ok: false, error: String(e) };
  }
  const durationMs = Date.now() - start;
  const status = result?.ok === false ? 'fail' : 'pass';
  _logActivity(win, projectId, { callId: id, tool, args, status, durationMs, result });
  _appendAudit({ tool, args, decision: 'allow', status, durationMs });
  return { ok: true, callId: id, durationMs, result, status };
}

// Internals exported from tools.js via a hidden global so we don't duplicate.
function getInternals() {
  // tools.js doesn't currently export these — see the patch in tools.js where we attach them.
  return global.__morbius_tools_internals__;
}

module.exports = { invokeTool };
