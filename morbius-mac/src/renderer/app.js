'use strict';
// Morbius — renderer. Vanilla JS, single file.
// Uses the design's CSS verbatim; wires real IPC to the agent + tools.

const m = window.morbius;

// ============================================================
// Tiny DOM helpers
// ============================================================
function h(tag, attrs = {}, ...kids) {
  const isSvg = tag === 'svg' || tag === 'path';
  const el = isSvg ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.setAttribute('class', v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else if (typeof v === 'boolean') { if (v) el.setAttribute(k, ''); }
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ============================================================
// State
// ============================================================
const state = {
  theme: (() => { try { return localStorage.getItem('morbius:theme') || 'dark'; } catch { return 'dark'; } })(),
  home: '',
  lastSkill: '/smoke',
  agentMode: 'mock', // 'anthropic' once a key is configured
  view: 'chat',            // chat | kanban | tests | bugs | devices | runs | flows | doctor | permissions | mcp | settings
  project: 'mygrant-glass',
  activeConvId: null,
  conversations: [],
  devices: [],
  sync: { status: 'synced', dirty: 0 },
  showPalette: false,
  paletteIdx: 0,
  paletteFilter: '',
  skills: [],
  activityEntries: [],
  loopProgress: null,      // { used, budget }
  toast: null,
  permissions: { rules: [], mode: 'default' },
  pendingPrompts: [],      // inline + queued
  probes: [],
  isStreaming: false,
};

// ============================================================
// Title bar
// ============================================================
function TitleBar() {
  const sync = state.sync;
  return h('div', { class: 'titlebar' },
    h('div', { class: 'title-center' },
      h('span', null, 'Morbius'),
      h('span', { class: 'sep' }, '—'),
      h('span', { class: 'proj-chip', onClick: () => openProjectSwitcher() },
        h('span', null, 'RF / ' + state.project),
        h('span', { class: 'caret' }, '⌄'),
      ),
    ),
    h('div', { class: 'title-right' },
      h('span', { class: 'sync-pill ' + (sync.status === 'dirty' ? 'dirty' : ''), onClick: () => triggerSync() },
        sync.status === 'synced' ? [h('span', { class: 'arrow' }, '↑↓'), h('span', null, 'synced')] :
        sync.status === 'pulling' ? [h('span', { class: 'arrow', style: { color: 'var(--info)' } }, '⟳'), h('span', null, 'pulling…')] :
        sync.status === 'dirty' ? [h('span', { class: 'arrow' }, '●'), h('span', null, 'dirty · ' + sync.dirty)] :
        [h('span', { class: 'arrow', style: { color: 'var(--fail)' } }, '⚠'), h('span', null, 'push failed')]
      ),
      h('span', { class: 'kbd', title: 'Halt agent' }, '⌘.'),
    ),
  );
}

// ============================================================
// NavRail — primary view switcher (52px-wide always-visible icon strip)
// ============================================================
function navGlyph(kind) {
  // Mini SVG glyphs matching the design's NavGlyph component
  const c = 'stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="none"';
  const svg = (inner) => `<svg width="16" height="16" viewBox="0 0 16 16">${inner}</svg>`;
  const map = {
    chat:     svg(`<rect x="2" y="3" width="12" height="9" rx="2" ${c}/><path d="M5 12 L5 14 L8 12" ${c}/><circle cx="6" cy="7.5" r="0.55" fill="currentColor"/><circle cx="8" cy="7.5" r="0.55" fill="currentColor"/><circle cx="10" cy="7.5" r="0.55" fill="currentColor"/>`),
    dashboard:svg(`<rect x="2.5" y="2.5" width="5" height="5" rx="0.8" ${c}/><rect x="8.5" y="2.5" width="5" height="3" rx="0.8" ${c}/><rect x="2.5" y="8.5" width="5" height="5" rx="0.8" ${c}/><rect x="8.5" y="6.5" width="5" height="7" rx="0.8" ${c}/>`),
    tests:    svg(`<rect x="2.5" y="2.5" width="11" height="11" rx="1.6" ${c}/><path d="M5 8 L7 10 L11 6" ${c}/>`),
    kanban:   svg(`<rect x="2.5" y="3" width="3" height="10" rx="0.6" ${c}/><rect x="6.5" y="3" width="3" height="6" rx="0.6" ${c}/><rect x="10.5" y="3" width="3" height="8" rx="0.6" ${c}/>`),
    devices:  svg(`<rect x="5" y="2" width="6" height="12" rx="1.4" ${c}/><line x1="7" y1="12.5" x2="9" y2="12.5" ${c}/>`),
    runs:     svg(`<circle cx="3" cy="4" r="0.9" fill="currentColor"/><line x1="6" y1="4" x2="14" y2="4" ${c}/><circle cx="3" cy="8" r="0.9" fill="currentColor"/><line x1="6" y1="8" x2="14" y2="8" ${c}/><circle cx="3" cy="12" r="0.9" fill="currentColor"/><line x1="6" y1="12" x2="14" y2="12" ${c}/>`),
    flows:    svg(`<rect x="2" y="3" width="5" height="3.5" rx="0.6" ${c}/><rect x="9" y="9.5" width="5" height="3.5" rx="0.6" ${c}/><path d="M7 4.75 L9 4.75 L9 11.25 L7 11.25" ${c}/>`),
    appmap:   svg(`<circle cx="3" cy="3.5" r="1.6" ${c}/><circle cx="13" cy="4" r="1.4" ${c}/><circle cx="8" cy="9" r="1.6" ${c}/><circle cx="3.5" cy="13" r="1.2" ${c}/><circle cx="13" cy="13" r="1.2" ${c}/><line x1="4.5" y1="3.8" x2="11.5" y2="3.9" ${c}/><line x1="3.2" y1="5.1" x2="7" y2="7.7" ${c}/><line x1="9" y1="7.7" x2="12.5" y2="5.3" ${c}/><line x1="7.2" y1="10.3" x2="4" y2="12" ${c}/><line x1="9" y1="10.3" x2="12" y2="12" ${c}/>`),
    healing:  svg(`<path d="M2 9 L4 9 L5.5 5 L8 13 L10.5 7 L12 9 L14 9" ${c}/>`),
    skills:   svg(`<line x1="11.2" y1="3" x2="4.8" y2="13" ${c}/>`),
    doctor:   svg(`<circle cx="8" cy="8" r="5.5" ${c}/><line x1="8" y1="5" x2="8" y2="11" ${c}/><line x1="5" y1="8" x2="11" y2="8" ${c}/>`),
    cog:      svg(`<circle cx="8" cy="8" r="2.2" ${c}/><circle cx="8" cy="8" r="5.5" ${c}/>`),
  };
  const span = document.createElement('span');
  span.className = 'nr-glyph';
  span.innerHTML = map[kind] || '';
  return span;
}

const NAV_ITEMS = [
  { id: 'chat',      kbd: '⌘1', label: 'Chat',      glyph: 'chat' },
  { id: 'dashboard', kbd: '⌘2', label: 'Overview',  glyph: 'dashboard' },
  { id: 'tests',     kbd: '⌘3', label: 'Tests',     glyph: 'tests' },
  { id: 'bugs',      kbd: '⌘4', label: 'Bugs',      glyph: 'kanban' },
  { id: 'devices',   kbd: '⌘5', label: 'Devices',   glyph: 'devices' },
  { id: 'runs',      kbd: '⌘6', label: 'Runs',      glyph: 'runs' },
  { id: 'flows',     kbd: '⌘7', label: 'Flows',     glyph: 'flows' },
  { id: 'appmap',    kbd: '⌘8', label: 'AppMap',    glyph: 'appmap' },
  { id: 'healing',   kbd: '⌘9', label: 'Heal',      glyph: 'healing' },
];
const NAV_BOTTOM = [
  { id: 'approvals', label: 'Approvals', glyph: 'doctor',  title: 'Approvals queue · ⌘⇧A' },
  { id: 'skills',    label: 'Skills',    glyph: 'skills',  title: 'Skills · /' },
  { id: 'doctor',    label: 'Doctor',    glyph: 'doctor',  title: 'Doctor · ⌘⇧D' },
  { id: 'settings',  label: 'Settings',  glyph: 'cog',     title: 'Settings · ⌘,' },
];

function NavRail() {
  const badges = computeNavBadges();
  const rail = h('div', { class: 'navrail' });
  rail.append(h('div', { class: 'nr-top' }, h('div', { class: 'nr-monogram' }, 'M')));
  const mid = h('div', { class: 'nr-mid' });
  for (const it of NAV_ITEMS) {
    const row = h('div', {
      class: 'nr-item ' + (it.id === state.view ? 'active' : ''),
      title: it.label + ' · ' + it.kbd,
      onClick: () => navigate(it.id),
    });
    row.append(navGlyph(it.glyph));
    row.append(h('span', { class: 'nr-label' }, it.label));
    if (badges[it.id]) row.append(h('span', { class: 'nr-badge ' + badges[it.id] }));
    mid.append(row);
  }
  rail.append(mid);
  const bot = h('div', { class: 'nr-bot' });
  for (const it of NAV_BOTTOM) {
    const row = h('div', {
      class: 'nr-item small ' + (it.id === state.view ? 'active' : ''),
      title: it.title,
      onClick: () => navigate(it.id),
    });
    row.append(navGlyph(it.glyph));
    if (badges[it.id]) row.append(h('span', { class: 'nr-badge ' + badges[it.id] }));
    bot.append(row);
  }
  bot.append(h('div', { class: 'nr-avatar', title: 'Profile' }, 'SD'));
  rail.append(bot);
  return rail;
}

function computeNavBadges() {
  const out = {};
  if (state.isStreaming) out.chat = 'run';
  const hasFailingBug = (state.dataBugs || []).some(b => (b.severity || '').toLowerCase().includes('p0'));
  if (hasFailingBug) out.bugs = 'fail';
  const hasFailingRun = (state.dataRuns || []).some(r => (r.status || '').toLowerCase().includes('fail'));
  if (hasFailingRun) out.runs = 'warn';
  const hasMissingProbe = (state.probes || []).some(p => !p.ok);
  if (hasMissingProbe) out.doctor = 'warn';
  return out;
}

// ============================================================
// ViewHead — chat-head-shaped bar with crumb + tabs + actions
// ============================================================
function ViewHead({ icon, name, meta, tabs = [], actions = null, kbd = null }) {
  const head = h('div', { class: 'view-head' });
  head.append(h('div', { class: 'crumb' },
    h('span', { class: 'ico' }, icon || ''),
    h('span', { class: 'name' }, name),
  ));
  if (meta) {
    head.append(h('span', { class: 'sep' }, '·'));
    head.append(h('span', { class: 'meta' }, meta));
  }
  head.append(h('span', { class: 'grow' }));
  if (tabs.length) {
    const tabsEl = h('div', { class: 'tabs' });
    for (const t of tabs) {
      tabsEl.append(h('span', {
        class: 'tab ' + (t.active ? 'active' : ''),
        onClick: t.onClick || (() => {}),
      }, t.label, t.kbd ? h('span', { class: 'kbd' }, t.kbd) : null));
    }
    head.append(tabsEl);
  }
  if (actions) head.append(actions);
  if (kbd) head.append(h('span', { class: 'kbd', title: 'open' }, kbd));
  return head;
}
function vbtn(label, opts = {}) {
  return h('span', {
    class: 'vbtn' + (opts.primary ? ' primary' : ''),
    onClick: opts.onClick || (() => {}),
  }, label);
}
function vbtnGroup(...items) {
  const wrap = h('div', { class: 'actions' });
  for (const it of items) wrap.append(it);
  return wrap;
}

// ============================================================
// Sidebar (conversations + devices)
// ============================================================
function Sidebar() {
  const groups = groupConversations(state.conversations);

  const sidebar = h('div', { class: 'sidebar' });
  sidebar.append(
    h('div', { class: 'side-section' }, 'Workspace'),
    h('label', { class: 'side-search' },
      h('span', null, '⌕'),
      h('input', {
        type: 'text', placeholder: 'Search conversations',
        value: state.convSearch || '',
        style: { flex: '1', minWidth: '0', background: 'transparent', border: '0', outline: '0', color: 'var(--fg)', font: 'inherit', fontSize: '12px' },
        onInput: (e) => { state.convSearch = e.target.value; renderApp(); },
      }),
      h('span', { class: 'kbd' }, '⌘K'),
    ),
    h('button', { class: 'new-conv', onClick: () => newConversation() },
      h('span', null, h('span', { class: 'plus' }, '+'), '  New conversation'),
      h('span', { class: 'kbd' }, '⌘N'),
    ),
  );

  const list = h('div', { class: 'conv-list' });
  if (groups.length === 0) {
    list.append(h('div', { class: 'conv-group' }, 'No conversations yet'));
  }
  for (const g of groups) {
    list.append(h('div', { class: 'conv-group' }, g.label));
    for (const it of g.items) {
      const row = h('div', {
        class: 'conv-row ' + (it.id === state.activeConvId ? 'active' : '') + (!it.messageCount ? ' muted' : ''),
        onClick: () => openConversation(it.id),
      },
        h('div', { class: 'title' }, it.title || 'Untitled'),
        h('div', { class: 'ts' }, shortTs(it.ts)),
        it.messageCount ? h('div', { class: 'sub' }, it.messageCount + ' messages') : null,
      );
      list.append(row);
    }
  }
  sidebar.append(list);

  // Devices mini
  if (state.devices.length > 0) {
    const dev = h('div', { class: 'devices-mini' });
    dev.append(h('div', { class: 'side-section', style: { paddingLeft: '4px', paddingTop: '6px' } }, 'Devices · ' + state.devices.length));
    for (const d of state.devices) {
      dev.append(h('div', { class: 'dev-row', onClick: () => navigate('devices') },
        h('span', { class: 'plat' }, d.platform === 'android' ? 'A' : ''),
        h('span', { class: 'name' }, d.name),
        h('span', { class: 'dot ' + (d.state === 'booted' ? 'booted' : 'cold') }),
      ));
    }
    sidebar.append(dev);
  }

  return sidebar;
}

function groupConversations(convs) {
  const q = (state.convSearch || '').trim().toLowerCase();
  const filtered = q ? convs.filter(c => (c.title || '').toLowerCase().includes(q)) : convs;
  if (!filtered.length) return [];
  const today = [], yesterday = [], week = [];
  const now = Date.now();
  for (const c of filtered) {
    const t = c.ts ? new Date(c.ts).getTime() : now;
    const age = now - t;
    if (age < 86400000) today.push(c);
    else if (age < 2 * 86400000) yesterday.push(c);
    else week.push(c);
  }
  const groups = [];
  if (today.length)     groups.push({ label: 'Today', items: today });
  if (yesterday.length) groups.push({ label: 'Yesterday', items: yesterday });
  if (week.length)      groups.push({ label: 'This week', items: week });
  return groups;
}
function shortTs(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toTimeString().slice(0, 5);
  }
  return d.toDateString().slice(0, 3);
}

// ============================================================
// Activity rail
// ============================================================
function ActivityRail() {
  const rail = h('div', { class: 'rail' });
  rail.append(
    h('div', { class: 'rail-head' },
      h('span', { class: 'title' }, 'Activity'),
      h('span', { class: 'grow' }),
      h('span', { class: 'ctrl', title: 'pause' }, '⏸'),
      h('span', { class: 'ctrl', title: 'step' }, '⤳'),
      h('span', { class: 'ctrl', title: 'collapse' }, '›'),
    ),
  );
  if (state.loopProgress) {
    const p = state.loopProgress;
    const pct = Math.min(100, Math.round((p.used.calls / Math.max(1, p.budget.calls)) * 100));
    const tokensIn = p.used.tokensIn || 0;
    const tokensOut = p.used.tokensOut || 0;
    const tokensLine = (tokensIn || tokensOut)
      ? '↓ ' + (tokensIn >= 1000 ? (tokensIn / 1000).toFixed(1) + 'k' : tokensIn) + ' tok · ↑ ' + (tokensOut >= 1000 ? (tokensOut / 1000).toFixed(1) + 'k' : tokensOut) + ' tok'
      : null;
    rail.append(h('div', { class: 'rail-loop' },
      h('div', { class: 'name' }, 'loop · ' + (p.skill || 'turn')),
      h('div', { class: 'meta' }, tokensLine || (p.used.calls + ' tool calls so far')),
      h('div', { class: 'bar' }, h('div', { class: 'fill', style: { width: pct + '%' } })),
      h('div', { class: 'footer' },
        h('span', null, '$' + (p.used.costUSD || 0).toFixed(3) + ' of $' + p.budget.costUSD.toFixed(2) + ' · ' + p.used.calls + ' of ' + p.budget.calls + ' calls'),
        h('span', null, pct + '%'),
      ),
    ));
  }
  const list = h('div', { class: 'rail-list' });

  // Group by minute, newest first
  const entries = [...state.activityEntries].reverse();
  let lastBucket = '';
  for (const e of entries) {
    if (!e.tool) continue; // skip non-tool entries
    const bucket = (e.ts || '').slice(11, 16);
    if (bucket !== lastBucket) {
      lastBucket = bucket;
      list.append(h('div', { class: 'rail-divider' }, bucket));
    }
    list.append(renderRailCard(e));
  }
  if (entries.length === 0) {
    list.append(h('div', { style: { color: 'var(--fg-dim)', fontSize: '11.5px', padding: '8px 4px' } },
      'Idle. The agent\'s tool calls will stream here.'));
  }
  rail.append(list);
  return rail;
}

function renderRailCard(e) {
  const statusMap = { running: 'run', pass: 'ok', fail: 'fail', warn: 'warn', wait: 'warn', denied: 'cancel', cancel: 'cancel' };
  const glyphMap = { pass: '✓', fail: '✗', wait: '⏸', warn: '⚠', denied: '⊘', cancel: '⊘', running: '' };
  const cls = statusMap[e.status] || 'run';
  const glyph = glyphMap[e.status] || '';
  const dur = e.durationMs ? (e.durationMs / 1000).toFixed(1) + 's' : '';
  const expanded = state.expandedRailCallId === e.callId;

  const card = h('div', {
    class: 'rail-card' + (e.status === 'wait' ? ' warn' : '') + (e.status === 'denied' ? ' cancelled' : ''),
    style: { cursor: 'pointer' },
    title: 'Click to ' + (expanded ? 'collapse' : 'expand'),
    onClick: () => {
      state.expandedRailCallId = expanded ? null : e.callId;
      renderApp();
    },
  });
  card.append(h('div', { class: 'top' },
    h('span', { class: 'ico ' + cls }, glyph),
    h('span', { class: 'name' }, e.tool),
    h('span', { class: 'grow' }),
    dur ? h('span', { class: 'dur' }, dur) : null,
  ));
  if (e.args && Object.keys(e.args).length) {
    const argsEl = h('div', { class: 'args' });
    const argEntries = Object.entries(e.args);
    const visible = expanded ? argEntries : argEntries.slice(0, 3);
    for (const [k, v] of visible) {
      argsEl.append(h('div', null, h('span', { class: 'k' }, k + ':'), ' ' + (expanded ? JSON.stringify(v) : truncate(JSON.stringify(v), 64))));
    }
    card.append(argsEl);
  }
  // Expanded card: show the full tool result body
  if (expanded && e.result) {
    const out = h('pre', {
      style: {
        marginTop: '6px', padding: '8px',
        background: 'rgba(0,0,0,0.28)',
        borderRadius: '4px',
        fontSize: '10.5px', color: 'var(--fg-muted)',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere',
        maxHeight: '240px', overflow: 'auto',
      },
    }, truncate(JSON.stringify(e.result, null, 2), 4000));
    card.append(out);
  }
  // Cost / dryRun annotation
  if (expanded && e.dryRun) {
    card.append(h('div', { style: { marginTop: '4px', color: 'var(--warn)', fontSize: '10.5px' } }, 'dry-run · no side effect'));
  }
  return card;
}

function truncate(s, n) { s = String(s); return s.length > n ? s.slice(0, n) + '…' : s; }

// ============================================================
// Chat pane
// ============================================================
function ChatPane() {
  const conv = currentConv();
  const wrap = h('div', { class: 'chat' });
  wrap.append(
    h('div', { class: 'chat-head' },
      h('span', { class: 'title' }, conv ? conv.title : 'New conversation'),
      h('span', { class: 'grow' }),
      h('span', { class: 'meta' }, state.isStreaming ? 'running…' : ''),
      // Agent-mode pill: green when real SDK is driving, amber when in mock mode
      h('span', {
        class: 'inline-pill ' + (state.agentMode === 'anthropic' ? 'ok' : 'warn'),
        title: state.agentMode === 'anthropic'
          ? 'Real Anthropic SDK · model picks tools, streams text'
          : 'Local mock · deterministic scripts. Configure ANTHROPIC_API_KEY or paste in Settings → Integrations.',
        style: { marginLeft: '6px' },
      }, state.agentMode === 'anthropic' ? 'Claude' : 'mock'),
      // Permission-mode pill: only visible when not in default mode
      (state.permissions?.mode && state.permissions.mode !== 'default') ? h('span', {
        class: 'inline-pill ' + (state.permissions.mode === 'bypassPermissions' ? 'fail' : 'warn'),
        title: 'Permission mode: ' + state.permissions.mode + '. Change in Settings → Permissions.',
        style: { marginLeft: '6px' },
      }, state.permissions.mode === 'bypassPermissions' ? 'bypass' :
         state.permissions.mode === 'dryRun' ? 'dry-run' :
         state.permissions.mode === 'plan' ? 'plan' : state.permissions.mode) : null,
      h('span', { class: 'kbd', style: { marginLeft: '6px' } }, '⌘.'),
      h('span', { style: { fontSize: '11px', color: 'var(--fg-dim)' } }, 'halt'),
    ),
  );

  if (!conv || (conv.messages || []).length === 0) {
    wrap.append(EmptyState());
  } else {
    const scroll = h('div', { class: 'chat-scroll', id: 'chat-scroll' });
    const inner = h('div', { class: 'chat-inner' });
    inner.append(h('div', { class: 'day-div' }, 'Today · ' + new Date().toTimeString().slice(0, 5)));

    for (const msg of conv.messages) {
      if (msg.role === 'user') {
        inner.append(h('div', { class: 'msg-user' + (msg.text?.startsWith('/') ? ' mono' : '') }, msg.text || ''));
      } else if (msg.role === 'assistant') {
        const body = h('div', { class: 'msg-body' });
        renderAssistantBody(body, msg);
        inner.append(h('div', { class: 'msg-agent' },
          h('div', { class: 'avatar' }),
          body,
        ));
      } else if (msg.role === 'system') {
        if (msg.kind === 'halted') inner.append(h('div', { class: 'sys-note' }, 'Halted by user.'));
      } else if (msg.role === 'perm') {
        inner.append(renderPermCard(msg));
      }
    }
    // Active streaming bubble (if streaming and no final message yet)
    if (state.isStreaming && conv.streamingText !== undefined) {
      const body = h('div', { class: 'msg-body' });
      body.innerHTML = renderMarkdownish(conv.streamingText || '');
      body.append(h('span', { class: 'cursor' }));
      // Append in-flight tool cards
      for (const tc of conv.streamingTools || []) {
        body.append(renderToolCard(tc));
      }
      inner.append(h('div', { class: 'msg-agent' },
        h('div', { class: 'avatar' }),
        body,
      ));
    }
    scroll.append(inner);
    wrap.append(scroll);
  }

  wrap.append(ChatInput());

  if (state.showPalette) wrap.append(SlashPalette());

  return wrap;
}

function EmptyState() {
  return h('div', { class: 'empty' },
    h('div', { class: 'mark' }, 'M'),
    h('h1', null, "Hi. I'm Morbius."),
    h('p', { class: 'lede' },
      "I run your QA. Tell me what you want tested, what you want reproduced, or which flake to chase down — I'll pick the tools, ask before anything destructive, and report back with evidence."),
    h('div', { class: 'chips' },
      h('span', { class: 'chip', onClick: () => quickSend('/smoke') }, h('span', { class: 'slash' }, '/'), 'smoke'),
      h('span', { class: 'chip', onClick: () => quickSend('/repro CH-1487') }, h('span', { class: 'slash' }, '/'), 'repro CH-1487'),
      h('span', { class: 'chip', onClick: () => quickSend('/heal payment-method-add') }, h('span', { class: 'slash' }, '/'), 'heal payment-method-add'),
      h('span', { class: 'chip', onClick: () => quickSend("What broke since yesterday's green?") }, "What broke since yesterday's green?"),
    ),
    h('div', { class: 'tips' },
      h('span', null, h('span', { class: 'kbd' }, '/'), ' skills'),
      h('span', null, h('span', { class: 'kbd' }, '⌘K'), ' command palette'),
      h('span', null, h('span', { class: 'kbd' }, '⌘.'), ' halt agent'),
      h('span', null, h('span', { class: 'kbd' }, '⌘⇧D'), ' environment doctor'),
    ),
  );
}

// Stream-text + per-message tool cards.
function renderAssistantBody(body, msg) {
  if (msg.text) {
    body.innerHTML = renderMarkdownish(msg.text);
    // After the markdown is in the DOM, replace any ```mermaid blocks with rendered SVG.
    renderMermaidBlocks(body);
  }
  for (const tc of msg.tools || []) body.append(renderToolCard(tc));
}

// Find <pre><code class="lang-mermaid"> blocks (and our `mermaid-source` divs)
// and replace them with mermaid-rendered SVG. Skips if mermaid lib isn't loaded.
async function renderMermaidBlocks(root) {
  if (!window.mermaid) return;
  initMermaidIfNeeded();
  const blocks = root.querySelectorAll('.mermaid-source');
  let i = 0;
  for (const block of blocks) {
    const src = block.textContent || '';
    if (!src.trim()) continue;
    const id = 'inline-mmd-' + Date.now() + '-' + (i++);
    try {
      const { svg } = await window.mermaid.render(id, src);
      const wrap = document.createElement('div');
      wrap.className = 'mermaid-rendered';
      wrap.style.cssText = 'margin: 8px 0; padding: 12px; background: var(--bg-sunken); border: 1px solid var(--border); border-radius: 8px; overflow: auto;';
      wrap.innerHTML = svg;
      block.replaceWith(wrap);
    } catch (e) {
      // Leave the source visible if mermaid can't render it
      const err = document.createElement('div');
      err.style.cssText = 'color: var(--fail); font-size: 11px; padding: 4px 0;';
      err.textContent = 'mermaid render error: ' + (e?.message || e);
      block.parentNode?.insertBefore(err, block.nextSibling);
    }
  }
}

function renderToolCard(tc) {
  const variant = tc.status === 'pass' ? 'pass' : tc.status === 'fail' ? 'fail' : tc.status === 'wait' || tc.status === 'warn' ? 'warn' : 'running';
  const pillCls = { running: 'run', pass: 'ok', fail: 'fail', warn: 'warn', wait: 'warn' }[tc.status] || 'gray';
  const pillTxt = { running: 'running', pass: 'pass', fail: 'fail', warn: 'flaky', wait: 'awaiting' }[tc.status] || tc.status;

  const card = h('div', { class: 'tool-card ' + variant });
  card.append(h('div', { class: 'tool-head' },
    h('span', { class: 'name' }, tc.toolName || tc.name),
    h('span', { class: 'grow' }),
    h('span', { class: 'pill ' + pillCls }, h('span', { class: 'ico' }), pillTxt),
    tc.dur ? h('span', { class: 'dur' }, tc.dur) : null,
  ));
  const args = tc.args || {};
  if (Object.keys(args).length) {
    const argsEl = h('div', { class: 'tool-args' });
    for (const [k, v] of Object.entries(args).slice(0, 4)) {
      argsEl.append(h('div', null, h('span', { class: 'k' }, k + ':'), ' ', h('span', { class: 'v' }, truncate(JSON.stringify(v), 100))));
    }
    card.append(argsEl);
  }
  return card;
}

function renderPermCard(p) {
  const card = h('div', {
    class: 'perm-card',
    tabindex: '-1',
    onKeydown: (e) => {
      if (e.key === 'Escape')         { resolvePrompt(p.promptId, 'deny',         p.tool, p.args); e.preventDefault(); }
      else if (e.key === 'Enter')     { resolvePrompt(p.promptId, 'allow',        p.tool, p.args); e.preventDefault(); }
      else if (e.key === 'a' && (e.metaKey || e.ctrlKey)) { resolvePrompt(p.promptId, 'always-allow', p.tool, p.args); e.preventDefault(); }
      else if (e.key === 'd' && (e.metaKey || e.ctrlKey)) { resolvePrompt(p.promptId, 'always-deny',  p.tool, p.args); e.preventDefault(); }
    },
  });
  card.append(
    h('div', { class: 'perm-head' },
      h('span', { class: 'badge' }, 'PERMISSION'),
      h('span', null, 'Agent wants to run a tool that needs your approval.'),
    ),
    h('div', { class: 'perm-tool' },
      p.tool, ' ',
      h('span', { class: 'inline-pill warn' }, p.category + (p.category === 'shell' ? ' · destructive' : '')),
    ),
    h('div', { class: 'perm-args' },
      h('span', { class: 'prompt' }, '$'),
      h('span', { style: { flex: 1 } }, p.args?.cmd || JSON.stringify(p.args || {})),
    ),
    h('div', { class: 'perm-why' },
      h('span', { class: 'label' }, 'WHY'),
      p.reasoning || 'No reasoning provided.',
    ),
    h('div', { class: 'perm-buttons' },
      h('button', { class: 'btn deny',         tabindex: '1', onClick: () => resolvePrompt(p.promptId, 'deny',         p.tool, p.args) }, 'Deny ', h('span', { class: 'kbd' }, '⎋')),
      h('button', { class: 'btn deny-always',  tabindex: '2', onClick: () => resolvePrompt(p.promptId, 'always-deny',  p.tool, p.args) }, 'Always deny'),
      h('button', { class: 'btn allow-once',   tabindex: '3', onClick: () => resolvePrompt(p.promptId, 'allow',        p.tool, p.args) }, 'Allow once'),
      h('button', { class: 'btn allow-always', tabindex: '4', onClick: () => resolvePrompt(p.promptId, 'always-allow', p.tool, p.args) }, 'Always allow ', h('span', { class: 'kbd' }, '⏎')),
    ),
  );
  setTimeout(() => { card.focus(); }, 80);
  return card;
}

function ChatInput() {
  const conv = currentConv();
  const wrap = h('div', { class: 'chat-input-wrap' });
  const inner = h('div', { class: 'inner' });
  const box = h('div', { class: 'chat-input focused' });
  const ta = h('textarea', {
    rows: 1,
    placeholder: 'Message Morbius — type / to see skills',
    onInput: (e) => {
      const v = e.target.value;
      state.chatDraft = v; // preserve across re-renders (toasts, drawer opens, etc.)
      autoSizeTextarea(e.target);
      if (v.startsWith('/')) {
        if (!state.showPalette || state.paletteFilter !== v) {
          state.showPalette = true;
          state.paletteFilter = v;
          // Don't re-render on every keystroke — palette filters live via filteredSkills()
          renderAppKeepFocus();
        }
      } else if (state.showPalette) {
        state.showPalette = false;
        renderApp();
        // After re-render, refocus
        setTimeout(() => { const t = document.querySelector('.chat-input textarea'); if (t) { t.value = state.chatDraft || ''; t.focus(); autoSizeTextarea(t); } }, 30);
      }
    },
    onKeyDown: async (e) => {
      if (state.showPalette) {
        if (e.key === 'ArrowDown') { state.paletteIdx = (state.paletteIdx + 1) % filteredSkills().length; renderAppKeepFocus(); e.preventDefault(); return; }
        if (e.key === 'ArrowUp')   { state.paletteIdx = (state.paletteIdx - 1 + filteredSkills().length) % filteredSkills().length; renderAppKeepFocus(); e.preventDefault(); return; }
        if (e.key === 'Tab')       { const s = filteredSkills()[state.paletteIdx]; if (s) { ta.value = s.slash + ' '; state.chatDraft = ta.value; } state.showPalette = false; renderApp(); e.preventDefault(); return; }
        if (e.key === 'Escape')    { state.showPalette = false; renderApp(); e.preventDefault(); return; }
      }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        const text = ta.value.trim();
        if (text) {
          ta.value = '';
          state.chatDraft = '';
          autoSizeTextarea(ta);
          await sendMessage(text);
        }
        e.preventDefault();
      }
    },
  });
  // Restore preserved draft after re-render
  if (state.chatDraft) {
    ta.value = state.chatDraft;
    setTimeout(() => autoSizeTextarea(ta), 0);
  }
  box.append(ta);
  const row = h('div', { class: 'row' },
    state.lastSkill ? h('span', {
      class: 'chip skill',
      title: 'Pre-fill last used skill',
      onClick: () => { ta.value = state.lastSkill + ' '; state.chatDraft = ta.value; autoSizeTextarea(ta); ta.focus(); },
    }, '↩ ' + state.lastSkill) : null,
    h('span', { class: 'chip', onClick: () => triggerAttach() }, '📎 attach'),
    h('span', { class: 'chip' }, 'project: ' + state.project),
    h('span', { class: 'grow' }),
    h('span', { class: 'chip' }, 'Local (mock)'),
    h('button', { class: 'send', type: 'button', onClick: () => { const t = ta.value.trim(); if (t) { ta.value = ''; autoSizeTextarea(ta); sendMessage(t); } } },
      'Send ', h('span', { class: 'kbd' }, '⌘↩')),
  );
  box.append(row);
  inner.append(box);
  wrap.append(inner);
  setTimeout(() => ta.focus(), 50);
  return wrap;
}

function autoSizeTextarea(ta) {
  ta.style.height = 'auto';
  ta.style.height = Math.min(140, ta.scrollHeight) + 'px';
}

function SlashPalette() {
  const skills = filteredSkills();
  const palette = h('div', { class: 'palette' },
    h('div', { class: 'phead' },
      h('span', null, 'Skills · ~/.morbius/skills'),
      h('span', { class: 'right' }, '↑↓ navigate · ⏎ run · ⎋ close'),
    ),
  );
  if (skills.length === 0) {
    palette.append(h('div', { class: 'palette-row' }, h('div', { class: 'text' }, h('span', { class: 'desc' }, 'No matches'))));
  }
  skills.forEach((s, i) => {
    palette.append(h('div', { class: 'palette-row ' + (i === state.paletteIdx ? 'active' : ''), onClick: () => quickSend(s.slash) },
      h('span', { class: 'slash' }, '/'),
      h('div', { class: 'text' },
        h('span', { class: 'skill' }, s.slash),
        h('span', { class: 'desc' }, s.desc),
      ),
      h('div', { class: 'tools' }, ...((s.tools || []).slice(0, 3).map(t => h('span', { class: 'mini' }, t)))),
      h('span', { class: 'cost' }, s.cost),
    ));
  });
  return palette;
}

function filteredSkills() {
  const f = (state.paletteFilter || '').toLowerCase().trim();
  if (!f || f === '/') return state.skills;
  // f starts with /, so does s.slash — direct prefix match
  return state.skills.filter(s => s.slash.toLowerCase().startsWith(f) || s.slash.toLowerCase().includes(f));
}

// ============================================================
// Secondary views
// ============================================================
function DoctorView() {
  const probes = state.probes;
  return h('div', { class: 'chat' },
    h('div', { class: 'chat-head' },
      h('span', { class: 'title' }, 'Environment Doctor'),
      h('span', { class: 'grow' }),
      h('span', { class: 'kbd' }, '⌘⇧D'),
    ),
    h('div', { class: 'doctor' },
      h('div', { class: 'doctor-inner' },
        h('h1', null, "Let's get your environment ready"),
        h('p', { class: 'sub' }, 'Morbius drives Maestro on your local sims and emulators. Probes below — install what\'s missing, or ask the agent to fix them.'),
        ...probes.map(renderProbeRow),
        h('div', { class: 'doctor-foot' },
          h('span', null,
            probes.filter(p => !p.ok).length + ' missing · ',
            probes.filter(p => p.ok).length + ' ok'),
          h('div', { style: { display: 'flex', gap: '8px' } },
            h('button', { class: 'btn-sm ghost', onClick: () => refreshProbes() }, 'Re-run probes'),
            h('button', { class: 'btn-sm primary', onClick: () => navigate('chat') }, 'Continue to chat'),
          ),
        ),
      ),
    ),
  );
}

function renderProbeRow(p) {
  const dotCls = p.ok ? 'ok' : 'fail';
  return h('div', { class: 'probe' },
    h('div', { class: 'pdot ' + dotCls }),
    h('div', { class: 'info' },
      h('div', { class: 'title' }, probeTitle(p.id)),
      h('div', { class: 'desc' }, p.detail || (p.ok ? 'detected' : 'not found')),
    ),
    h('div', { class: 'actions' },
      h('button', { class: 'btn-sm ghost', onClick: () => runOneProbe(p.id) }, 'Verify'),
      !p.ok ? h('button', { class: 'btn-sm primary', onClick: () => openInstallHelp(p.id) }, 'Install') : null,
    ),
  );
}
function probeTitle(id) {
  return ({
    xcrun: 'Xcode Command Line Tools',
    adb: 'Android SDK platform-tools',
    jdk: 'JDK (17+ required)',
    maestro: 'Maestro CLI',
    node: 'Node.js runtime',
    'anthropic-key': 'Anthropic API key',
    'github-pat': 'GitHub Personal Access Token',
  })[id] || id;
}

// ============================================================
// View-shell helpers
// ============================================================
function wrappedView(head, body) {
  return h('div', { class: 'chat' }, head, body);
}

// Filter helpers — kanban views read state.testFilter/state.bugFilter and
// state.testSearch/state.bugSearch and return only the rows that match.
function applyTestFilter(tests) {
  const f = state.testFilter || 'all';
  const q = (state.testSearch || '').trim().toLowerCase();
  return (tests || []).filter(t => {
    const s = (t.status || '').toLowerCase();
    let matchStatus = true;
    if (f === 'pass')   matchStatus = /pass/.test(s);
    else if (f === 'fail')   matchStatus = /fail/.test(s);
    else if (f === 'flaky')  matchStatus = /flak/.test(s);
    else if (f === 'notrun') matchStatus = !/pass|fail|flak|progress|running/.test(s);
    if (!matchStatus) return false;
    if (!q) return true;
    const hay = (t.title + ' ' + (t.path || '') + ' ' + (t.id || '') + ' ' + (t.category || '')).toLowerCase();
    return hay.includes(q);
  });
}
function applyBugFilter(bugs) {
  const f = state.bugFilter || 'all';
  const q = (state.bugSearch || '').trim().toLowerCase();
  return (bugs || []).filter(b => {
    const sev = (b.severity || '').toLowerCase();
    let matchSev = true;
    if (f === 'p0') matchSev = /p0/.test(sev);
    else if (f === 'p1') matchSev = /p1/.test(sev);
    else if (f === 'p2') matchSev = /p2/.test(sev);
    else if (f === 'p3') matchSev = /p3/.test(sev);
    if (!matchSev) return false;
    if (!q) return true;
    const hay = (b.title + ' ' + (b.file || '') + ' ' + (b.id || '')).toLowerCase();
    return hay.includes(q);
  });
}

// Real search input — replaces the read-only span "search-mini" decoration.
function SearchInput({ placeholder = 'Search…', value = '', onInput, kbd, width = 240 }) {
  const wrap = h('span', { class: 'search-mini', style: { display: 'inline-flex', alignItems: 'center', gap: '6px', minWidth: width + 'px' } });
  wrap.append(h('span', null, '⌕'));
  const input = h('input', {
    type: 'text',
    placeholder,
    value: value || '',
    style: { flex: '1', minWidth: '0', background: 'transparent', border: '0', outline: '0', color: 'var(--fg)', font: 'inherit', fontSize: '12px' },
    onInput: (e) => onInput && onInput(e.target.value),
  });
  wrap.append(input);
  if (kbd) wrap.append(h('span', { class: 'kbd' }, kbd));
  return wrap;
}

// Preview banner — placed at the top of a view body to mark it as a mockup.
// `what` describes what's stubbed, `why` explains what unlocks it (which epic).
function PreviewBanner({ what, why }) {
  return h('div', { class: 'preview-banner' },
    h('span', { class: 'badge' }, 'PREVIEW'),
    h('span', { class: 'what' }, what),
    h('span', { class: 'why' }, ' — ', why),
  );
}
function HealthBar(ok, warn, fail, dim) {
  const t = Math.max(1, ok + warn + fail + dim);
  return h('div', { class: 'hbar' },
    h('i', { class: 'seg ok',   style: { width: (ok/t*100) + '%' } }),
    h('i', { class: 'seg warn', style: { width: (warn/t*100) + '%' } }),
    h('i', { class: 'seg fail', style: { width: (fail/t*100) + '%' } }),
    h('i', { class: 'seg dim',  style: { width: (dim/t*100) + '%' } }),
  );
}

// ============================================================
// Dashboard / Overview (⌘2)
// ============================================================
function DashboardView() {
  const tests = state.dataTests || [];
  const bugs = state.dataBugs || [];
  const pass = tests.filter(t => /pass/i.test(t.status || '')).length;
  const fail = tests.filter(t => /fail/i.test(t.status || '')).length;
  const flaky = tests.filter(t => /flak/i.test(t.status || '')).length;
  const open = bugs.length;
  const passPct = tests.length ? Math.round((pass / tests.length) * 100) : 0;
  const categories = groupByCategory(tests);
  const recentBugs = bugs.slice(0, 3);

  const head = ViewHead({
    icon: '⌘2', name: 'Overview', meta: state.project + ' · last sync 1m ago',
    tabs: [{ label: 'Today', active: true }, { label: '7d' }, { label: '30d' }, { label: 'All' }],
    actions: vbtnGroup(vbtn('Export'), vbtn('Run /smoke', { primary: true, onClick: () => quickSend('/smoke') })),
  });

  const dashboard = h('div', { class: 'dashboard' });

  // Hero strip
  const hero = h('div', { class: 'hero-strip' });
  hero.append(
    heroCard({ big: true, label: 'Pass rate', num: passPct, unit: '%', delta: 'across ' + tests.length + ' tests' }),
    heroCard({ label: 'Tests',     num: tests.length, delta: Object.keys(categories).length + ' categories' }),
    heroCard({ label: 'Flaky',     num: flaky, cls: 'warnc', delta: flaky + ' open' }),
    heroCard({ label: 'Open bugs', num: open, cls: 'failc', delta: bugs.filter(b => /p0/i.test(b.severity || '')).length + ' P0' }),
    heroCard({ label: 'Categories', num: Object.keys(categories).length, delta: 'from test frontmatter' }),
  );
  hero.querySelector('.hero-card.big').append(HealthBar(pass, flaky, fail, Math.max(0, tests.length - pass - flaky - fail)));
  dashboard.append(hero);

  // Grid: category health (big) + side cards
  const grid = h('div', { class: 'dash-grid' });
  const catCard = h('div', { class: 'dash-card cat' });
  catCard.append(h('div', { class: 'dash-h' },
    h('span', { class: 't' }, 'Category health'),
    h('span', { class: 'grow' }),
    h('span', { class: 'sub' }, Object.keys(categories).length + ' categories'),
  ));
  const catList = h('div', { class: 'cat-list' });
  for (const [name, c] of Object.entries(categories).slice(0, 14)) {
    catList.append(h('div', { class: 'cat-row' },
      h('span', { class: 'name' }, name),
      HealthBar(c.ok, c.warn, c.fail, c.dim),
      h('span', { class: 'counts' },
        h('span', { class: 'ok' }, c.ok),
        c.warn ? h('span', { class: 'warn' }, '·' + c.warn) : null,
        c.fail ? h('span', { class: 'fail' }, '·' + c.fail) : null,
        c.dim ? h('span', { class: 'dim' }, '·' + c.dim) : null,
      ),
      h('span', { class: 'pct' }, Math.round((c.ok / Math.max(1, c.n)) * 100) + '%'),
    ));
  }
  catCard.append(catList);

  const side = h('div', { class: 'dash-side' });
  const recentCard = h('div', { class: 'dash-card' });
  recentCard.append(h('div', { class: 'dash-h' },
    h('span', { class: 't' }, 'Recent bugs · ' + bugs.length),
    h('span', { class: 'grow' }),
    h('span', { class: 'sub' }, 'today'),
  ));
  const bugList = h('div', { class: 'recent-bugs' });
  if (recentBugs.length === 0) bugList.append(h('div', { style: { color: 'var(--fg-dim)', fontSize: '12px', padding: '8px' } }, '(no bugs)'));
  for (const b of recentBugs) {
    const sev = (b.severity || 'p3').toLowerCase().replace(/[^p0-9]/g, '');
    bugList.append(h('div', { class: 'bug' },
      h('div', { class: 'thumb' + (/p0|p1/i.test(b.severity || '') ? ' fail' : '') }),
      h('div', { class: 'grow' },
        h('div', { class: 'line1' },
          h('span', { class: 'sev ' + sev }, (b.severity || 'P?').toUpperCase()),
          h('span', { class: 'id' }, (b.id || b.file || '').replace(/\.md$/, '').slice(0, 14)),
        ),
        h('div', { class: 'title' }, b.title),
      ),
    ));
  }
  recentCard.append(bugList);
  side.append(recentCard);

  // Quick actions card
  const quickCard = h('div', { class: 'dash-card quick' });
  quickCard.append(h('div', { class: 'dash-h' }, h('span', { class: 't' }, 'Quick actions')));
  const qa = h('div', { class: 'qa-list' });
  qa.append(
    h('button', { class: 'qa primary', onClick: () => { navigate('chat'); quickSend('/smoke'); } }, h('span', { class: 'kbd' }, '⌘R'), 'Run /smoke'),
    h('button', { class: 'qa', onClick: () => navigate('flows') }, h('span', { class: 'kbd' }, '⌘7'), 'Open flows'),
    h('button', { class: 'qa', onClick: () => navigate('appmap') }, h('span', { class: 'kbd' }, '⌘8'), 'Open AppMap'),
    h('button', { class: 'qa', onClick: () => navigate('healing') }, h('span', { class: 'kbd' }, '⌘9'), 'Healing queue'),
    h('button', { class: 'qa', onClick: () => navigate('bugs') }, h('span', { class: 'kbd' }, '⌘4'), 'Bugs board'),
    h('button', { class: 'qa', onClick: () => navigate('doctor') }, h('span', { class: 'kbd' }, '⌘⇧D'), 'Doctor'),
  );
  quickCard.append(qa);
  side.append(quickCard);

  grid.append(catCard);
  grid.append(side);
  dashboard.append(grid);

  return wrappedView(head, dashboard);
}

function heroCard({ big, label, num, unit, delta, cls }) {
  const card = h('div', { class: 'hero-card' + (big ? ' big' : '') });
  card.append(
    h('div', { class: 'lbl' }, label),
    h('div', { class: 'num' + (cls ? ' ' + cls : '') }, num, unit ? h('span', { class: 'unit' }, unit) : null),
    h('div', { class: 'delta' }, delta),
  );
  return card;
}

function groupByCategory(tests) {
  const cats = {};
  for (const t of tests) {
    const cat = (t.path && t.path.split('/')[0]) || 'uncategorized';
    cats[cat] = cats[cat] || { n: 0, ok: 0, warn: 0, fail: 0, dim: 0 };
    cats[cat].n += 1;
    const s = (t.status || '').toLowerCase();
    if (/pass/.test(s)) cats[cat].ok += 1;
    else if (/flak/.test(s)) cats[cat].warn += 1;
    else if (/fail/.test(s)) cats[cat].fail += 1;
    else cats[cat].dim += 1;
  }
  return cats;
}

// ============================================================
// Tests Kanban (⌘3) — 5 columns: Pass / Fail / Flaky / In Progress / Not Run
// ============================================================
function TestsView() {
  const allTests = state.dataTests || [];
  const tests = applyTestFilter(allTests);
  const cols = {
    pass:     { name: 'Pass',        dot: 'verify',  cards: [] },
    fail:     { name: 'Fail',        dot: 'invest',  cards: [] },
    flaky:    { name: 'Flaky',       dot: 'work',    cards: [] },
    progress: { name: 'In Progress', dot: 'work',    cards: [] },
    notrun:   { name: 'Not Run',     dot: 'closed',  cards: [] },
  };
  // Bucket the original list for filter-chip counts (counts always show pre-filter)
  const counts = { pass: 0, fail: 0, flaky: 0, progress: 0, notrun: 0 };
  for (const t of allTests) {
    const s = (t.status || '').toLowerCase();
    if (/pass/.test(s)) counts.pass++;
    else if (/fail/.test(s)) counts.fail++;
    else if (/flak/.test(s)) counts.flaky++;
    else if (/progress|running/.test(s)) counts.progress++;
    else counts.notrun++;
  }
  for (const t of tests) {
    const s = (t.status || '').toLowerCase();
    if (/pass/.test(s)) cols.pass.cards.push(t);
    else if (/fail/.test(s)) cols.fail.cards.push(t);
    else if (/flak/.test(s)) cols.flaky.cards.push(t);
    else if (/progress|running/.test(s)) cols.progress.cards.push(t);
    else cols.notrun.cards.push(t);
  }

  const head = ViewHead({
    icon: '⌘3', name: 'Tests', meta: state.project + ' · ' + tests.length + ' of ' + allTests.length + ' cases',
    tabs: [{ label: 'Board', active: true }, { label: 'List' }, { label: 'Matrix' }],
    actions: vbtnGroup(vbtn('Group: status ⌄'), vbtn('+ New test', { primary: true })),
  });
  const active = state.testFilter || 'all';
  const filterChip = (id, label, dotCls = null, count = null) =>
    h('span', { class: 'fchip ' + (active === id ? 'active' : ''),
                onClick: () => { state.testFilter = id; renderApp(); } },
      dotCls ? h('span', { class: 'dot ' + dotCls }) : null,
      count != null ? label + ' · ' + count : label);
  const filterBar = h('div', { class: 'filter-bar' },
    filterChip('all',      'All',      null,   allTests.length),
    filterChip('pass',     'Pass',     'ok',   counts.pass),
    filterChip('fail',     'Fail',     'fail', counts.fail),
    filterChip('flaky',    'Flaky',    'warn', counts.flaky),
    filterChip('notrun',   'Not Run',  null,   counts.notrun),
    h('span', { class: 'grow' }),
    SearchInput({ placeholder: 'Filter…', value: state.testSearch, onInput: (v) => { state.testSearch = v; renderApp(); } }),
  );

  const kanban = h('div', { class: 'kanban' });
  for (const col of Object.values(cols)) {
    const c = h('div', { class: 'kan-col' });
    c.append(h('div', { class: 'head' },
      h('span', { class: 'dot ' + col.dot }),
      h('span', { class: 'name' }, col.name),
      h('span', { class: 'grow' }),
      h('span', { class: 'count' }, col.cards.length),
    ));
    const body = h('div', { class: 'body' });
    for (const t of col.cards.slice(0, 60)) {
      const tcId = (t.file || '').replace(/\.md$/, '').slice(0, 20);
      const sevCls = /pass/i.test(t.status || '') ? 'p3' : /fail/i.test(t.status || '') ? 'p0' : /flak/i.test(t.status || '') ? 'p1' : 'p2';
      body.append(h('div', { class: 'kan-card', onClick: () => openTestDrawer(t) },
        h('div', { class: 'id' },
          h('span', { class: 'sev ' + sevCls }, (t.id || 'TC').toString().toUpperCase().slice(0, 8)),
          h('span', null, tcId),
          h('span', { class: 'grow' }),
          t.priority ? h('span', null, t.priority) : null,
        ),
        h('div', { class: 'title' }, t.title || t.file),
        t.path && t.path.includes('/') ? h('div', { class: 'strip' }, h('span', { class: 'pillk' }, t.path.split('/')[0])) : null,
      ));
    }
    c.append(body);
    c.append(h('div', { class: 'add' }, '+ Add card'));
    kanban.append(c);
  }
  const wrapper = h('div', { class: 'view-body' }, filterBar, kanban);
  return wrappedView(head, wrapper);
}

// ============================================================
// Bugs Kanban (⌘4)
// ============================================================
function BugsView() {
  const allBugs = state.dataBugs || [];
  const bugs = applyBugFilter(allBugs);
  const cols = {
    triage:  { name: 'Triage',        dot: 'triage', cards: [] },
    invest:  { name: 'Investigating', dot: 'invest', cards: [] },
    work:    { name: 'In progress',   dot: 'work',   cards: [] },
    verify:  { name: 'Verifying',     dot: 'verify', cards: [] },
    closed:  { name: 'Closed · 7d',   dot: 'closed', cards: [] },
  };
  for (const b of bugs) {
    const s = (b.status || '').toLowerCase();
    if (/closed|done|fixed|wontfix|shipped/.test(s)) cols.closed.cards.push(b);
    else if (/verify/.test(s)) cols.verify.cards.push(b);
    else if (/progress|fix|wip/.test(s)) cols.work.cards.push(b);
    else if (/investig|repro/.test(s)) cols.invest.cards.push(b);
    else cols.triage.cards.push(b);
  }
  const head = ViewHead({
    icon: '⌘4', name: 'Bugs · QA board', meta: state.project + ' · ' + bugs.length + ' of ' + allBugs.length + ' total',
    tabs: [{ label: 'Board', active: true }, { label: 'List' }, { label: 'Timeline' }],
    actions: vbtnGroup(vbtn('Group: severity ⌄'), vbtn('+ New bug', { primary: true })),
  });
  const active = state.bugFilter || 'all';
  const countBy = (re) => allBugs.filter(b => re.test(b.severity || '')).length;
  const fchip = (id, label, dotCls, count) =>
    h('span', { class: 'fchip ' + (active === id ? 'active' : ''),
                onClick: () => { state.bugFilter = id; renderApp(); } },
      dotCls ? h('span', { class: 'dot ' + dotCls }) : null,
      count != null ? label + ' · ' + count : label);
  const filterBar = h('div', { class: 'filter-bar' },
    fchip('all', 'All', null, allBugs.length),
    fchip('p0',  'P0',  'fail',  countBy(/p0/i)),
    fchip('p1',  'P1',  'warn',  countBy(/p1/i)),
    fchip('p2',  'P2',  null,    countBy(/p2/i)),
    fchip('p3',  'P3',  null,    countBy(/p3/i)),
    h('span', { class: 'grow' }),
    SearchInput({ placeholder: 'Filter bugs…', value: state.bugSearch, onInput: (v) => { state.bugSearch = v; renderApp(); } }),
  );
  const kanban = h('div', { class: 'kanban' });
  for (const col of Object.values(cols)) {
    const c = h('div', { class: 'kan-col' });
    c.append(h('div', { class: 'head' },
      h('span', { class: 'dot ' + col.dot }),
      h('span', { class: 'name' }, col.name),
      h('span', { class: 'grow' }),
      h('span', { class: 'count' }, col.cards.length),
    ));
    const body = h('div', { class: 'body' });
    for (const b of col.cards.slice(0, 30)) {
      const sev = ((b.severity || 'p3').toLowerCase().match(/p\d/) || ['p3'])[0];
      body.append(h('div', { class: 'kan-card', onClick: () => openBugDrawer(b) },
        h('div', { class: 'id' },
          h('span', { class: 'sev ' + sev }, sev.toUpperCase()),
          h('span', null, (b.id || b.file || '').replace(/\.md$/, '').slice(0, 18)),
          h('span', { class: 'grow' }),
          h('span', null, b.device || ''),
        ),
        h('div', { class: 'title' }, b.title),
      ));
    }
    c.append(body);
    c.append(h('div', { class: 'add' }, '+ Add card'));
    kanban.append(c);
  }
  return wrappedView(head, h('div', { class: 'view-body' }, filterBar, kanban));
}

// ============================================================
// Devices fleet (⌘5)
// ============================================================
function DevicesView() {
  const head = ViewHead({
    icon: '⌘5', name: 'Devices', meta: state.devices.length + ' detected',
    tabs: [{ label: 'Fleet', active: true }, { label: 'Live' }, { label: 'Screenshots' }],
    actions: vbtnGroup(vbtn('Refresh', { onClick: () => refreshDevices() }), vbtn('+ Add device', { primary: true })),
  });
  const filterBar = h('div', { class: 'filter-bar' },
    h('span', { class: 'fchip active' }, 'All · ' + state.devices.length),
    h('span', { class: 'fchip' }, 'iOS · ' + state.devices.filter(d => d.platform === 'ios').length),
    h('span', { class: 'fchip' }, 'Android · ' + state.devices.filter(d => d.platform === 'android').length),
    h('span', { class: 'fchip' }, h('span', { class: 'dot ok' }), 'Booted · ' + state.devices.filter(d => d.state === 'booted').length),
    h('span', { class: 'grow' }),
  );

  const devicesGrid = h('div', { class: 'devices' });
  for (const d of state.devices) {
    devicesGrid.append(h('div', { class: 'dev-card' },
      h('div', { class: 'screen' + (d.state === 'cold' ? ' cold' : '') },
        d.platform === 'ios' ? h('div', { class: 'notch' }) : null,
        h('div', { class: 'stripes' }),
        h('div', { class: 'nav' }),
        d.name === 'emulator-5554' || d.state === 'booted' ? h('div', { class: 'live-dot' }) : null,
      ),
      h('div', { class: 'info' },
        h('div', { class: 'name' }, d.name, ' ', h('span', { class: 'plat' }, d.platform === 'android' ? 'Android' : 'iOS')),
        h('div', { class: 'os' }, (d.os || '—') + ' · ' + (d.platform === 'android' ? 'emulator' : 'simulator')),
        h('div', { class: 'status ' + (d.state === 'booted' ? 'booted' : 'cold') },
          h('span', { class: 'dot' }),
          d.state === 'booted' ? 'Booted · idle' : 'Cold',
        ),
        h('div', { class: 'actions' },
          h('button', {
            class: 'btn-sm primary',
            onClick: () => {
              const flows = state.dataFlows || [];
              const flowName = flows[0]?.name || 'smoke';
              quickSend('/explore ' + flowName + ' on ' + (d.name || d.udid));
            },
          }, 'Run flow'),
          h('button', { class: 'btn-sm', onClick: () => captureScreenshot(d.udid) }, 'Screenshot'),
          h('button', { class: 'btn-sm ghost', onClick: () => quickSend('tailLog last 40 lines for ' + (d.name || d.udid)) }, 'Logs'),
        ),
      ),
    ));
  }
  // Add-device placeholder card
  devicesGrid.append(h('div', { class: 'dev-card add' },
    h('div', { class: 'screen', style: { background: 'transparent', border: '1px dashed var(--border)' } }),
    h('div', { class: 'info' },
      h('div', { class: 'name', style: { color: 'var(--fg-muted)' } }, '+ Add device'),
      h('div', { class: 'os' }, 'Boot a simulator or emulator'),
    ),
  ));

  return wrappedView(head, h('div', { class: 'view-body' }, filterBar, devicesGrid));
}

// ============================================================
// Runs (⌘6)
// ============================================================
function RunsView() {
  const runs = state.dataRuns || [];
  const passN = runs.filter(r => /pass/i.test(r.status || '')).length;
  const failN = runs.filter(r => /fail/i.test(r.status || '')).length;
  const flakyN = runs.filter(r => /flak/i.test(r.status || '')).length;
  const passRate = runs.length ? Math.round((passN / runs.length) * 100) : 0;

  const head = ViewHead({
    icon: '⌘6', name: 'Runs',
    meta: 'last 7d · ' + runs.length + ' runs · ' + passRate + '% pass',
    tabs: [{ label: 'List', active: true }, { label: 'Calendar' }, { label: 'Flake report' }],
    actions: vbtnGroup(vbtn('Export'), vbtn('+ Run flow', { primary: true, onClick: () => quickSend('/smoke') })),
  });

  const runsEl = h('div', { class: 'runs' });

  // Stats strip — sparklines derived from real run statuses (last 30)
  // Each tile filters the same pool to highlight its dimension.
  const strip = h('div', { class: 'runs-strip' });
  const recent = runs.slice(-30); // assume listRuns returns chronological
  const sparkFor = (filterFn) => {
    if (recent.length < 3) return h('div', { class: 'spark' }); // not enough data
    const wrap = h('div', { class: 'spark' });
    for (const r of recent) {
      const s = (r.status || '').toLowerCase();
      let cls = '', ht = 8;
      if (/pass/.test(s))      { cls = 'ok';   ht = 16; }
      else if (/fail/.test(s)) { cls = 'fail'; ht = 22; }
      else if (/flak/.test(s)) { cls = 'warn'; ht = 19; }
      // Dim if outside the filter dimension
      if (!filterFn(s)) { cls = ''; ht = 8; }
      wrap.append(h('i', { class: cls, style: { height: ht + 'px' } }));
    }
    return wrap;
  };
  strip.append(
    h('div', { class: 'stat-tile' },
      h('div', { class: 'lbl' }, 'Pass rate'),
      h('div', { class: 'num' }, runs.length ? passRate + '%' : '—'),
      h('div', { class: 'delta up' }, passN + ' of ' + runs.length),
      sparkFor(() => true)),
    h('div', { class: 'stat-tile' },
      h('div', { class: 'lbl' }, 'Failures'),
      h('div', { class: 'num' }, failN),
      h('div', { class: 'delta' }, failN + ' of ' + runs.length),
      sparkFor((s) => /fail/.test(s))),
    h('div', { class: 'stat-tile' },
      h('div', { class: 'lbl' }, 'Flakes'),
      h('div', { class: 'num' }, flakyN),
      h('div', { class: 'delta' }, flakyN + ' tagged'),
      sparkFor((s) => /flak/.test(s))),
    h('div', { class: 'stat-tile' },
      h('div', { class: 'lbl' }, 'Agent spend'),
      h('div', { class: 'num' }, '$0.00'),
      h('div', { class: 'delta' }, 'tracked once E-012 lands'),
      h('div', { class: 'spark' })),
  );
  runsEl.append(strip);

  // Filter bar
  runsEl.append(h('div', { class: 'filter-bar', style: { borderBottom: '1px solid var(--border)' } },
    h('span', { class: 'fchip active' }, 'All'),
    h('span', { class: 'fchip' }, h('span', { class: 'dot ok' }), 'Pass · ' + passN),
    h('span', { class: 'fchip' }, h('span', { class: 'dot fail' }), 'Fail · ' + failN),
    h('span', { class: 'fchip' }, h('span', { class: 'dot warn' }), 'Flaky · ' + flakyN),
    h('span', { class: 'fchip' }, 'Devices: all ⌄'),
    h('span', { class: 'grow' }),
    h('span', { class: 'search-mini' }, h('span', null, '⌕'), h('span', { class: 'grow' }, 'Filter by flow, device, tag…')),
  ));

  // Day group
  if (runs.length === 0) {
    runsEl.append(h('div', { style: { padding: '40px', textAlign: 'center', color: 'var(--fg-dim)' } }, '(no run markdowns found for ' + state.project + ')'));
  } else {
    runsEl.append(h('div', { class: 'run-day' }, 'Recent · ' + state.project));
    const table = h('div', { class: 'run-table' });
    table.append(
      h('div', { class: 'th' }, 'Time'),
      h('div', { class: 'th' }, 'Flow / Tool'),
      h('div', { class: 'th' }, 'Device'),
      h('div', { class: 'th' }, 'Status'),
      h('div', { class: 'th' }, 'Dur'),
      h('div', { class: 'th' }, 'Tag'),
      h('div', { class: 'th' }, 'Cost'),
    );
    for (const r of runs.slice(0, 60)) {
      const s = (r.status || '').toLowerCase();
      const sCls = /pass/.test(s) ? 'ok' : /fail/.test(s) ? 'fail' : /flak/.test(s) ? 'warn' : 'ok';
      const icon = sCls === 'ok' ? '✓' : sCls === 'fail' ? '✗' : '⚠';
      table.append(h('div', { class: 'row' },
        h('div', { class: 'td t-time' }, (r.created || '—').slice(0, 5)),
        h('div', { class: 'td t-flow' },
          h('span', { class: 'name' }, r.flow || (r.file || '').replace(/\.md$/, '')),
          h('span', { class: 'sub' }, r.title || ''),
        ),
        h('div', { class: 'td t-dev' }, r.device || '—'),
        h('div', { class: 'td' }, h('span', { class: 'status-pill ' + sCls }, icon + ' ' + (s || 'pass'))),
        h('div', { class: 'td t-dur' }, r.duration || '—'),
        h('div', { class: 'td' }, h('span', { class: 'pillk', style: { fontFamily: 'var(--font-mono)', fontSize: '10px', padding: '1px 6px', border: '1px solid var(--border)', borderRadius: '999px', color: 'var(--fg-muted)', background: 'var(--bg-sunken)' } }, r.tag || 'run')),
        h('div', { class: 'td t-cost' }, r.cost || '$0.00'),
      ));
    }
    runsEl.append(table);
  }

  return wrappedView(head, runsEl);
}

// ============================================================
// Flows YAML viewer (⌘7)
// ============================================================
function FlowsView() {
  const flows = state.dataFlows || [];
  // Pick a default active flow once per nav into this view.
  if (!state.activeFlow && flows.length && !state.activeFlowLoading) {
    state.activeFlowLoading = true;
    setTimeout(() => openFlow(flows[0]), 0);
  }
  const head = ViewHead({
    icon: '⌘7', name: 'Flows', meta: state.project + ' · ' + flows.length + ' YAML files',
    tabs: [{ label: 'YAML', active: true }, { label: 'Humanized' }, { label: 'History' }],
    actions: vbtnGroup(vbtn('Validate'), vbtn('+ New flow', { primary: true })),
  });
  const wrap = h('div', { class: 'flows-wrap', style: { display: 'grid', gridTemplateColumns: '280px 1fr', height: '100%', overflow: 'hidden' } });
  const side = h('div', { class: 'flows-side', style: { borderRight: '1px solid var(--border)', overflow: 'auto', padding: '8px' } });
  // Group by subdir (android/ios) when present
  const groups = new Map();
  for (const f of flows) {
    const sub = f.sub || '';
    if (!groups.has(sub)) groups.set(sub, []);
    groups.get(sub).push(f);
  }
  for (const [sub, items] of groups) {
    if (sub) side.append(h('div', { style: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-dim)', padding: '8px 10px 4px' } }, sub));
    for (const f of items) {
      const isActive = state.activeFlow && state.activeFlow.absPath === f.absPath;
      side.append(h('div', {
        class: 'flow-row' + (isActive ? ' active' : ''),
        style: {
          padding: '8px 10px', borderRadius: '6px', cursor: 'pointer',
          fontFamily: 'var(--font-mono)', fontSize: '11.5px',
          color: isActive ? 'var(--fg)' : 'var(--fg-muted)',
          background: isActive ? 'var(--bg-elev-2)' : 'transparent',
        },
        onClick: () => openFlow(f),
      }, f.name));
    }
  }
  const view = h('div', { style: { overflow: 'auto', padding: '20px 24px' } });
  if (state.activeFlowContent && state.activeFlow) {
    view.append(h('div', { class: 'view-head', style: { padding: '0 0 12px' } },
      h('div', { class: 'crumb' }, h('span', { class: 'ico' }, '▶'), h('span', { class: 'name' }, state.activeFlow.name)),
      state.activeFlow.sub ? h('span', { class: 'meta' }, state.activeFlow.sub) : null,
    ));
    view.append(h('pre', {
      class: 'code-block',
      style: { whiteSpace: 'pre', overflow: 'auto', maxHeight: 'calc(100vh - 280px)', fontFamily: 'var(--font-mono)', fontSize: '12px' },
    }, state.activeFlowContent));
    view.append(h('div', { style: { marginTop: '14px', color: 'var(--fg-muted)', fontSize: '11.5px' } },
      state.activeFlow.absPath));
  } else {
    view.append(h('div', { style: { color: 'var(--fg-dim)', padding: '40px', textAlign: 'center' } },
      flows.length ? 'Loading flow…' : '(no .yaml files found)'));
  }
  wrap.append(side, view);
  return wrappedView(head, wrap);
}

async function openFlow(flow) {
  // Backwards-compat: accept a plain filename string too
  if (typeof flow === 'string') flow = { name: flow, absPath: (state.repoRoot || '') + '/flows/' + flow };
  state.activeFlow = flow;
  state.activeFlowContent = '';
  state.activeFlowLoading = false;
  const r = await m.toolCall({ tool: 'readFile', args: { filePath: flow.absPath }, projectId: state.project });
  state.activeFlowContent = r.result?.contents || '(file not found at ' + flow.absPath + ')';
  renderApp();
}

// ============================================================
// AppMap (⌘8) — dot-grid mock + agent narrative
// ============================================================
// AppMap canvas dimensions in "world" coordinates. The world is wrapped
// in a single transform: translate + scale element so zoom + pan are cheap.
// World height grows with the number of rows of nodes (computed in derive()).
const APPMAP_W = 820;
const APPMAP_NODE_W = 140;
const APPMAP_NODE_H = 48;
const APPMAP_GAP_X = 40;
const APPMAP_GAP_Y = 100;
const APPMAP_COLS = 4;
const APPMAP_PAD = 30;

// Derive the AppMap nodes + edges from the active project's real test data.
// Each test markdown has a `category` (frontmatter) or its path's first segment.
function deriveAppMap() {
  const tests = state.dataTests || [];
  const flows = state.dataFlows || [];

  // Group tests by category
  const cats = new Map(); // categoryId → { id, label, tests: [], statuses: Set }
  for (const t of tests) {
    const id = t.category || (t.path && t.path.split('/')[0]) || 'uncategorized';
    if (!cats.has(id)) cats.set(id, {
      id,
      label: prettifyCategory(id),
      tests: [],
      ok: 0, fail: 0, warn: 0, dim: 0,
    });
    const c = cats.get(id);
    c.tests.push(t);
    const s = (t.status || '').toLowerCase();
    if (/pass/.test(s))      c.ok += 1;
    else if (/fail/.test(s)) c.fail += 1;
    else if (/flak/.test(s)) c.warn += 1;
    else                     c.dim += 1;
  }

  // Count flow files per category by name substring match (best effort)
  const flowCount = (catId) => {
    const short = catId.split(/[-_]/)[0].toLowerCase();
    return flows.filter(f => (f.name || f).toLowerCase().includes(short)).length;
  };

  // Layout: grid
  const nodes = [];
  let i = 0;
  for (const [, c] of cats) {
    const col = i % APPMAP_COLS;
    const row = Math.floor(i / APPMAP_COLS);
    const cls = c.fail > 0 ? 'fail'
              : c.warn > 0 ? 'warn'
              : c.ok > 0   ? 'ok'
              : 'dim';
    nodes.push({
      id: c.id,
      label: c.label,
      flows: flowCount(c.id),
      tests: c.tests.length,
      cls,
      x: APPMAP_PAD + col * (APPMAP_NODE_W + APPMAP_GAP_X),
      y: APPMAP_PAD + row * (APPMAP_NODE_H + APPMAP_GAP_Y),
    });
    i += 1;
  }

  // Edges: sequential reading-order spine so the graph isn't disconnected
  const edges = [];
  for (let k = 0; k < nodes.length - 1; k++) {
    edges.push([nodes[k].id, nodes[k + 1].id]);
  }

  const rows = Math.ceil(nodes.length / APPMAP_COLS);
  const worldH = APPMAP_PAD * 2 + rows * (APPMAP_NODE_H + APPMAP_GAP_Y) - APPMAP_GAP_Y;

  return { nodes, edges, worldH: Math.max(440, worldH) };
}

function prettifyCategory(id) {
  return id
    .replace(/^\d+[-_]/, '')           // drop leading numeric prefixes "1-", "11_"
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .slice(0, 24);                     // keep it short for the node card
}

function ensureAppMapState() {
  if (state.appmapZoom == null) state.appmapZoom = 1;
  if (state.appmapPanX == null) state.appmapPanX = 0;
  if (state.appmapPanY == null) state.appmapPanY = 0;
  if (state.appmapTab == null)  state.appmapTab = 'graph';
  if (state.appMapSource == null) state.appMapSource = ''; // mermaid string from config.json
  if (state.appMapSvg == null)    state.appMapSvg = '';    // rendered SVG cache
  if (state.appMapError == null)  state.appMapError = '';
}

// Initialize mermaid.js once on first use — matches the web app's theme + config
function initMermaidIfNeeded() {
  if (state.appMapMermaidInit || !window.mermaid) return;
  window.mermaid.initialize({
    startOnLoad: false,
    theme: state.theme === 'light' ? 'default' : 'dark',
    securityLevel: 'loose',
    flowchart: { curve: 'basis', useMaxWidth: false, htmlLabels: true },
    themeVariables: state.theme === 'light' ? {} : {
      primaryColor:       '#1a1d20',
      primaryBorderColor: '#3a3f44',
      primaryTextColor:   '#e7eaee',
      lineColor:          '#6e757d',
      tertiaryColor:      '#0b0c0d',
    },
  });
  state.appMapMermaidInit = true;
}

async function loadAppMap() {
  state.appMapSource = '';
  state.appMapSvg = '';
  state.appMapError = '';
  state.appMapLoading = true;
  renderApp();
  try {
    const r = await m.getAppMap({ projectId: state.project });
    state.appMapSource = r?.appMap || '';
    if (!state.appMapSource) {
      state.appMapError = 'No appMap field in data/' + state.project + '/config.json';
    } else {
      // Match the web app's clean: drop linkStyle lines mermaid can choke on
      const cleaned = state.appMapSource.replace(/^\s*linkStyle\s+[^\n]*$/gim, '');
      initMermaidIfNeeded();
      const id = 'appmap-svg-' + Date.now();
      const { svg } = await window.mermaid.render(id, cleaned);
      state.appMapSvg = svg;
    }
  } catch (e) {
    state.appMapError = 'Mermaid render failed: ' + (e?.message || String(e));
  }
  state.appMapLoading = false;
  renderApp();
}

function AppMapView() {
  ensureAppMapState();

  // First entry into the view (or after project switch): load the mermaid source
  if (!state.appMapLoading && !state.appMapSource && !state.appMapError) {
    setTimeout(() => loadAppMap(), 0);
  }

  const nodeCount = (state.appMapSource.match(/^\s*\w+\s*[\[\(\{]/gm) || []).length;
  const edgeCount = (state.appMapSource.match(/-->|---|==>|-\.->/g) || []).length;

  const head = ViewHead({
    icon: '⌘8', name: 'AppMap',
    meta: state.project + (state.appMapSource ? ' · ' + nodeCount + ' nodes · ' + edgeCount + ' edges' : ''),
    tabs: [
      { label: 'Graph',     active: state.appmapTab === 'graph',     onClick: () => { state.appmapTab = 'graph'; renderApp(); } },
      { label: 'Narrative', active: state.appmapTab === 'narrative', onClick: () => { state.appmapTab = 'narrative'; renderApp(); } },
      { label: 'Source',    active: state.appmapTab === 'source',    onClick: () => { state.appmapTab = 'source'; renderApp(); } },
    ],
    actions: vbtnGroup(
      vbtn('Reload', { onClick: () => loadAppMap() }),
      vbtn('Copy Mermaid', { primary: true, onClick: () => exportMermaid() }),
    ),
  });

  const stats = h('div', { class: 'ap-stats' },
    h('div', { class: 'ap-stat' }, h('div', { class: 'lbl' }, 'Nodes'),       h('div', { class: 'num' }, nodeCount || '—')),
    h('div', { class: 'ap-stat' }, h('div', { class: 'lbl' }, 'Edges'),       h('div', { class: 'num' }, edgeCount || '—')),
    h('div', { class: 'ap-stat' }, h('div', { class: 'lbl' }, 'Flows'),       h('div', { class: 'num' }, (state.dataFlows || []).length)),
    h('div', { class: 'ap-stat' }, h('div', { class: 'lbl' }, 'Tests'),       h('div', { class: 'num' }, (state.dataTests || []).length)),
  );

  const body =
    state.appmapTab === 'graph'     ? AppMapGraph() :
    state.appmapTab === 'narrative' ? AppMapNarrative() :
    state.appmapTab === 'source'    ? AppMapSource() :
    AppMapGraph();

  return wrappedView(head, h('div', { class: 'appmap' }, stats, body));
}

function AppMapGraph() {
  const canvas = h('div', { class: 'ap-canvas' });
  canvas.style.height = 'calc(100vh - 280px)';

  // Loading / empty / error states
  if (state.appMapLoading) {
    canvas.append(h('div', { style: { padding: '60px 24px', textAlign: 'center', color: 'var(--fg-dim)' } }, 'Rendering Mermaid graph for ' + state.project + '…'));
    return canvas;
  }
  if (state.appMapError) {
    canvas.append(h('div', { style: { padding: '60px 24px', textAlign: 'center', color: 'var(--fg-muted)' } },
      h('div', { style: { color: 'var(--warn)', marginBottom: '10px', fontSize: '13px' } }, state.appMapError),
      h('div', { style: { fontSize: '12px' } },
        'Add an ', h('code', null, 'appMap'), ' field to ',
        h('code', null, 'data/' + state.project + '/config.json'), ' with a Mermaid ', h('code', null, 'graph TD'), ' string.'),
      h('div', { style: { marginTop: '14px' } },
        h('button', { class: 'btn-sm primary', onClick: () => loadAppMap() }, 'Retry')),
    ));
    return canvas;
  }
  if (!state.appMapSvg) {
    canvas.append(h('div', { style: { padding: '60px 24px', textAlign: 'center', color: 'var(--fg-dim)' } }, 'No graph yet — try Reload.'));
    return canvas;
  }

  // Zoom + pan controls
  const zoom = h('div', { class: 'ap-zoom' });
  zoom.append(
    h('span', { class: 'zbtn', title: 'Zoom out',  onClick: () => setAppMapZoom(state.appmapZoom - 0.1) }, '−'),
    h('span', { class: 'zval' }, Math.round(state.appmapZoom * 100) + '%'),
    h('span', { class: 'zbtn', title: 'Zoom in',   onClick: () => setAppMapZoom(state.appmapZoom + 0.1) }, '+'),
    h('span', { class: 'zsep' }, '·'),
    h('span', { class: 'zbtn', title: 'Fit to canvas', onClick: () => fitAppMap() }, '⤢ fit'),
    h('span', { class: 'zsep' }, '·'),
    h('span', { class: 'zbtn', title: 'Reset', onClick: () => resetAppMap() }, '↺'),
  );
  canvas.append(zoom);

  // World wrapper — single transformed layer holds the mermaid SVG
  const world = h('div', { class: 'ap-world' });
  world.style.position = 'absolute';
  world.style.left = '0';
  world.style.top = '0';
  world.style.transformOrigin = '0 0';
  world.style.transform = `translate(${state.appmapPanX}px, ${state.appmapPanY}px) scale(${state.appmapZoom})`;
  world.style.willChange = 'transform';
  // Inject the rendered SVG. The SVG sets its own width/height; we let it size naturally.
  world.innerHTML = state.appMapSvg;
  const svgEl = world.querySelector('svg');
  if (svgEl) {
    svgEl.style.display = 'block';
    svgEl.style.maxWidth = 'none';   // override mermaid's max-width:100% so it doesn't shrink to container
    svgEl.style.height = 'auto';
  }
  canvas.append(world);

  // Pan via drag
  let panStart = null;
  canvas.addEventListener('mousedown', (e) => {
    // Don't capture clicks on the zoom chip or on nodes
    if (e.target.closest('.ap-zoom') || e.target.closest('.ap-node')) return;
    panStart = { mx: e.clientX, my: e.clientY, px: state.appmapPanX, py: state.appmapPanY };
    canvas.style.cursor = 'grabbing';
  });
  window.addEventListener('mousemove', (e) => {
    if (!panStart) return;
    state.appmapPanX = panStart.px + (e.clientX - panStart.mx);
    state.appmapPanY = panStart.py + (e.clientY - panStart.my);
    world.style.transform = `translate(${state.appmapPanX}px, ${state.appmapPanY}px) scale(${state.appmapZoom})`;
  });
  window.addEventListener('mouseup', () => { panStart = null; canvas.style.cursor = ''; });
  canvas.style.cursor = 'grab';

  // Wheel-to-zoom (clamped 0.4 – 2.5)
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const next = Math.max(0.4, Math.min(2.5, state.appmapZoom - e.deltaY * 0.001));
    setAppMapZoom(next);
  }, { passive: false });

  return canvas;
}

function setAppMapZoom(z) {
  state.appmapZoom = Math.max(0.4, Math.min(2.5, Math.round(z * 100) / 100));
  renderApp();
}
function fitAppMap() {
  const canvas = document.querySelector('.ap-canvas');
  const svgEl = canvas && canvas.querySelector('.ap-world svg');
  if (!canvas || !svgEl) { resetAppMap(); return; }
  // Read SVG natural dimensions from its bbox or attributes
  let w = svgEl.viewBox?.baseVal?.width  || svgEl.getBBox?.().width  || svgEl.clientWidth;
  let h = svgEl.viewBox?.baseVal?.height || svgEl.getBBox?.().height || svgEl.clientHeight;
  if (!w || !h) { resetAppMap(); return; }
  const rect = canvas.getBoundingClientRect();
  const fitW = rect.width / w;
  const fitH = rect.height / h;
  state.appmapZoom = Math.max(0.3, Math.min(2.5, Math.min(fitW, fitH) * 0.92));
  state.appmapPanX = (rect.width  - w * state.appmapZoom) / 2;
  state.appmapPanY = (rect.height - h * state.appmapZoom) / 2;
  renderApp();
}
function resetAppMap() {
  state.appmapZoom = 1;
  state.appmapPanX = 0;
  state.appmapPanY = 0;
  renderApp();
}

function AppMapNarrative() {
  return h('div', { class: 'ap-narr' },
    h('div', { class: 'ap-acc violet' },
      h('div', { class: 'acc-head' },
        h('span', { class: 'acc-lbl' }, 'Why these flows'),
        h('span', { class: 'grow' }),
        h('span', { class: 'acc-meta' }, 'agent rationale · haiku-4.5 · 2m'),
      ),
      h('p', null, 'Checkout is the highest-revenue path and the most-broken one over the last 30d (3 regressions, 2 still open). I prioritized 4 flows here covering happy-path, guest, saved-card, and the new gift-card branch added in build rc3. Payments inherits the same priority; the "delete saved card" sub-flow is still untested on Android and would close a real coverage gap.'),
    ),
    h('div', { class: 'ap-acc amber' },
      h('div', { class: 'acc-head' }, h('span', { class: 'acc-lbl' }, 'What I learned this week'), h('span', { class: 'grow' }), h('span', { class: 'acc-meta' }, '3 entries')),
      h('ul', null,
        h('li', null, h('strong', null, 'Order Summary'), ' sometimes renders 200ms late on slow simulators — I now wait on the title text, not the container.'),
        h('li', null, 'The ', h('code', null, 'id="cart-icon"'), ' selector is fragile on Android; ', h('code', null, 'text="Cart"'), ' survived 4 builds in a row.'),
        h('li', null, 'Bottom-sheet dismiss stutter is reproducible only on cold launch. I separated it from the search flow so it does not blame search.'),
      ),
    ),
  );
}

function AppMapRationale() {
  return h('div', { class: 'ap-narr', style: { gridTemplateColumns: '1fr' } },
    h('div', { class: 'ap-acc violet' },
      h('div', { class: 'acc-head' },
        h('span', { class: 'acc-lbl' }, 'Decision log'),
        h('span', { class: 'grow' }),
        h('span', { class: 'acc-meta' }, '14 entries'),
      ),
      h('ul', null,
        h('li', null, h('strong', null, '2026-05-12 10:11 ·'), ' Promoted ', h('code', null, 'checkout-happy-path'), ' from P2 → P0 after 3rd regression in 7d.'),
        h('li', null, h('strong', null, '2026-05-11 17:42 ·'), ' Approved selector heal on ', h('code', null, 'payment-method-add'), ' after 3 verifications passed.'),
        h('li', null, h('strong', null, '2026-05-10 09:18 ·'), ' Added ', h('code', null, 'gift-card'), ' branch to checkout coverage (4 new tests).'),
        h('li', null, h('strong', null, '2026-05-09 14:02 ·'), ' Separated bottom-sheet stutter from search flow — cold-launch only.'),
        h('li', null, h('strong', null, '2026-05-08 11:00 ·'), ' Switched ', h('code', null, 'cart-icon'), ' to text-based selector across 4 flows.'),
      ),
    ),
  );
}

async function exportMermaid() {
  if (!state.appMapSource) { setToast('No appMap source loaded'); return; }
  await navigator.clipboard?.writeText(state.appMapSource);
  setToast('Mermaid source copied to clipboard (' + state.appMapSource.length + ' chars)');
}

function AppMapSource() {
  return h('div', { style: { padding: '0 4px', overflow: 'auto' } },
    h('pre', {
      class: 'code-block',
      style: { whiteSpace: 'pre', fontFamily: 'var(--font-mono)', fontSize: '11.5px', maxHeight: 'calc(100vh - 280px)', overflow: 'auto' },
    }, state.appMapSource || '(no appMap field in config.json)'),
  );
}

// ============================================================
// Healing queue (⌘9)
// ============================================================
function HealingView() {
  const rows = [
    { flow: 'payment-method-add.yaml', step: 'tapOn "Add card"',         old: 'id="add-card-cta"',          neu: 'text="Add card" + index=0',                       why: 'The id was renamed in build rc3. Falling back to visible text + ordinal is stable across 4 prior builds.', conf: 92, runs: 3, dev: 'Pixel-7',   author: 'agent', status: 'pending' },
    { flow: 'checkout-happy-path.yaml', step: 'assertVisible "Order Summary"', old: 'text="Order Summary" · 8s', neu: 'waitForAnimationToEnd → text="Order Summary" · 12s', why: 'On low-end sims the summary fades in 200ms after the parent renders. Waiting for the animation removes the timing race.', conf: 78, runs: 1, dev: 'iPhone-SE', author: 'agent', status: 'pending' },
    { flow: 'search-recents.yaml',     step: 'tapOn recent.item[1]',     old: 'id="recent-item-1"',         neu: 'text=$RECENT_QUERY (templated)',                  why: "Recent items reorder when the user reopens the screen — index-based selectors flake. Templated by the test's seed query.", conf: 63, runs: 2, dev: 'Pixel-7',   author: 'agent', status: 'review' },
    { flow: 'sign-in.yaml',            step: 'tapOn id="submit"',        old: 'id="submit"',                neu: 'id="signin-submit-btn"',                          why: "Generic id collides with the cart's submit button after deep-link. Scoped id is unambiguous.",           conf: 96, runs: 3, dev: 'iPhone-15', author: 'agent', status: 'approved' },
  ];
  const head = ViewHead({
    icon: '⌘9', name: 'Healing queue',
    meta: rows.filter(r => r.status === 'pending').length + ' pending · ' +
          rows.filter(r => r.status === 'review').length + ' in review · ' +
          rows.filter(r => r.status === 'approved').length + ' approved',
    tabs: [{ label: 'Open', active: true }, { label: 'Approved' }, { label: 'Rejected' }, { label: 'All · ' + rows.length }],
    actions: vbtnGroup(vbtn('Run all approved'), vbtn('Auto-approve ≥ 90%', { primary: true })),
  });
  const filterBar = h('div', { class: 'filter-bar' },
    h('span', { class: 'fchip active' }, 'All authors'),
    h('span', { class: 'fchip' }, 'Agent · ' + rows.length),
    h('span', { class: 'fchip' }, 'Human · 0'),
    h('span', { class: 'fchip' }, h('span', { class: 'dot ok' }), '≥85%'),
    h('span', { class: 'fchip' }, h('span', { class: 'dot warn' }), '70-84%'),
    h('span', { class: 'fchip' }, h('span', { class: 'dot fail' }), '<70%'),
    h('span', { class: 'grow' }),
    h('span', { class: 'search-mini' }, h('span', null, '⌕'), h('span', { class: 'grow' }, 'Filter by flow, selector…')),
  );
  const list = h('div', { class: 'healing' });
  for (const r of rows) {
    const tier = r.conf >= 85 ? 'ok' : r.conf >= 70 ? 'warn' : 'low';
    const row = h('div', { class: 'heal-row status-' + r.status });
    row.append(
      h('div', { class: 'hr-head' },
        h('span', { class: 'flow' }, r.flow),
        h('span', { class: 'sep' }, '›'),
        h('span', { class: 'step' }, r.step),
        h('span', { class: 'grow' }),
        h('span', { class: 'meta' }, r.dev + ' · ' + r.runs + ' validation runs · ' + r.author),
      ),
      h('div', { class: 'hr-body' },
        h('div', { class: 'diff' },
          h('div', { class: 'diff-row del' }, h('span', { class: 'g' }, '−'), h('code', null, r.old)),
          h('div', { class: 'diff-row add' }, h('span', { class: 'g' }, '+'), h('code', null, r.neu)),
        ),
        h('div', { class: 'rationale' },
          h('div', { class: 'r-lbl' }, 'Rationale'),
          h('div', { class: 'r-text' }, r.why),
        ),
        h('div', { class: 'confwrap' },
          h('div', { class: 'r-lbl' }, 'Confidence'),
          h('div', { class: 'conf' },
            h('div', { class: 'bar ' + tier }, h('div', { class: 'fill', style: { width: r.conf + '%' } })),
            h('div', { class: 'num' }, r.conf + '%'),
          ),
        ),
      ),
    );
    const foot = h('div', { class: 'hr-foot' });
    if (r.status === 'approved') {
      foot.append(h('span', { class: 'status-tag ok' }, '✓ Approved · running on next /heal'));
      foot.append(h('span', { class: 'grow' }));
      foot.append(h('button', { class: 'hbtn ghost' }, 'Revert'));
    } else if (r.status === 'review') {
      foot.append(h('span', { class: 'status-tag warn' }, 'In review · siva'));
      foot.append(h('span', { class: 'grow' }));
      foot.append(h('button', { class: 'hbtn' }, 'View runs (2)'));
      foot.append(h('button', { class: 'hbtn primary' }, 'Resume review'));
    } else {
      foot.append(h('span', { class: 'grow' }));
      foot.append(h('button', { class: 'hbtn deny' }, 'Reject'));
      foot.append(h('button', { class: 'hbtn' }, 'Modify'));
      foot.append(h('button', { class: 'hbtn primary' }, 'Approve ', h('span', { class: 'kbd' }, '⏎')));
    }
    row.append(foot);
    list.append(row);
  }
  return wrappedView(head, h('div', { class: 'view-body' },
    PreviewBanner({ what: 'Healing proposals are sample data.', why: 'Real proposals require the agent loop (E-009) + the /heal skill running end-to-end.' }),
    filterBar, list));
}

// ============================================================
// Live Run (overlay from Devices · 'View live')
// ============================================================
function LiveRunView() {
  const steps = [
    { s: 'pass', label: 'launchApp',     arg: 'com.mygrant.app',           dur: '1.2s' },
    { s: 'pass', label: 'tapOn',         arg: 'id="email"',                dur: '0.3s' },
    { s: 'pass', label: 'inputText',     arg: '"test@example.com"',        dur: '0.4s' },
    { s: 'pass', label: 'tapOn',         arg: 'id="password"',             dur: '0.2s' },
    { s: 'pass', label: 'inputText',     arg: '"·······"',                  dur: '0.4s' },
    { s: 'pass', label: 'tapOn',         arg: 'id="signin-submit-btn"',    dur: '0.5s' },
    { s: 'run',  label: 'assertVisible', arg: '"Welcome back" · waiting…', dur: '0.6s', current: true },
    { s: 'wait', label: 'tapOn',         arg: 'id="featured-card-0"',      dur: '—' },
    { s: 'wait', label: 'tapOn',         arg: 'id="add-to-cart"',          dur: '—' },
    { s: 'wait', label: 'tapOn',         arg: 'id="cart-icon"',            dur: '—' },
    { s: 'wait', label: 'tapOn',         arg: 'id="checkout-btn"',         dur: '—' },
    { s: 'wait', label: 'assertVisible', arg: '"Order Summary" · 12s',     dur: '—' },
  ];
  const logs = [
    { t: '10:14:02.118', l: '▶ [device] iPhone-15-Pro · iOS 17.4 · sim-4F2A' },
    { t: '10:14:02.220', l: '▶ [maestro] flows/login-then-checkout.yaml' },
    { t: '10:14:03.451', l: '✓ tapOn email · matched in 213ms' },
    { t: '10:14:03.846', l: '✓ inputText · 19 chars' },
    { t: '10:14:04.062', l: '✓ tapOn password · matched in 198ms' },
    { t: '10:14:05.001', l: '✓ tapOn signin-submit-btn · matched in 234ms' },
    { t: '10:14:05.183', l: '▶ network · POST /api/v2/auth/login → 200 OK · 412ms' },
    { t: '10:14:05.610', l: '▶ assertVisible "Welcome back" · polling (200ms)…' },
    { t: '10:14:05.812', l: '  · poll 1 · no match' },
    { t: '10:14:06.021', l: '  · poll 2 · no match' },
    { t: '10:14:06.232', l: '  · poll 3 · matched, fades in' },
  ];
  const head = ViewHead({
    icon: '●', name: 'Live · login-then-checkout.yaml',
    meta: 'iPhone 15 Pro · started 4.1s ago · est. 28s remaining',
    tabs: [{ label: 'Live', active: true }, { label: 'Plan' }, { label: 'Network · 3' }, { label: 'Console' }],
    actions: vbtnGroup(
      h('span', { class: 'vbtn', onClick: () => m.killAgent() }, h('span', { class: 'kbd' }, '⌘.'), ' Halt'),
      vbtn('Pause'),
      vbtn('Step over', { primary: true }),
    ),
  });
  const filterBar = h('div', { class: 'filter-bar' },
    h('span', { class: 'fchip', style: { color: 'var(--info)', borderColor: 'rgba(96,165,250,0.30)' } },
      h('span', { class: 'dot', style: { background: 'var(--info)', animation: 'pulse 1.2s ease-in-out infinite alternate' } }),
      'Running · step 7 of 12'),
    h('span', { class: 'fchip' }, 'budget · $0.04 of $0.20'),
    h('span', { class: 'fchip' }, '/heal CH-1487'),
    h('span', { class: 'grow' }),
    h('span', { class: 'fchip' }, 'Streaming · WebSocket'),
  );
  const wrap = h('div', { class: 'liverun' });

  const stepsCol = h('div', { class: 'lr-steps' });
  stepsCol.append(
    h('div', { class: 'ph' }, 'Steps · 12 ',
      h('span', { class: 'grow' }),
      h('span', { style: { fontFamily: 'var(--font-mono)' } }, '6 ok · 1 running · 5 queued')),
    h('div', { class: 'lr-progress' },
      h('div', { class: 'bar' }, h('div', { class: 'fill', style: { width: '54%' } })),
      h('span', { class: 'pct' }, '54%'),
    ),
  );
  const stepsList = h('div', { class: 'steps' });
  for (const s of steps) {
    stepsList.append(h('div', { class: 'step ' + s.s + (s.current ? ' current' : '') },
      h('span', { class: 'ico' }, s.s === 'pass' ? '✓' : s.s === 'fail' ? '✗' : s.s === 'run' ? '●' : '·'),
      h('span', { class: 'label' }, s.label, ' ', h('span', { class: 'arg' }, s.arg)),
      h('span', { class: 'dur' }, s.dur),
    ));
  }
  stepsCol.append(stepsList);

  const screenCol = h('div', { class: 'lr-screen' },
    h('div', { class: 'ph' }, 'Device · iPhone 15 Pro · live mirror ',
      h('span', { class: 'grow' }),
      h('span', { style: { fontFamily: 'var(--font-mono)', color: 'var(--info)' } }, '● 30 fps')),
    h('div', { class: 'device-wrap' },
      h('div', { class: 'device-tall' },
        h('div', { class: 'bar' }, h('span', null, '9:41'), h('span', null, '●●● 5G ■')),
        h('div', { class: 'canvas' },
          h('div', { class: 'stripes' }),
          h('div', { class: 'highlight' },
            h('div', { class: 'ring' }),
            h('div', { class: 'caption' }, 'assertVisible · "Welcome back"'),
          ),
        ),
        h('div', { class: 'hbar' }, h('div', { class: 'nub' })),
      ),
    ),
  );

  const logsCol = h('div', { class: 'lr-logs' });
  logsCol.append(h('div', { class: 'ph' }, 'Log stream ',
    h('span', { class: 'grow' }),
    h('span', { style: { fontFamily: 'var(--font-mono)' } }, 'tail · 12 / 312 lines')));
  const logsList = h('div', { class: 'log-list' });
  for (const g of logs) {
    logsList.append(h('div', { class: 'log-line' },
      h('span', { class: 't' }, g.t),
      h('span', { class: 'l' }, g.l),
    ));
  }
  logsList.append(h('div', { class: 'log-line caret' },
    h('span', { class: 't' }, '10:14:06.4..'),
    h('span', { class: 'l' }, '▶ waiting', h('span', { class: 'cursor' })),
  ));
  logsCol.append(logsList);

  wrap.append(stepsCol, screenCol, logsCol);
  return wrappedView(head, h('div', { class: 'view-body' },
    PreviewBanner({ what: 'Steps, device mirror, and log stream are sample data.', why: 'Real live-run streaming requires the agent loop running maestro with WebSocket events (E-014).' }),
    filterBar, wrap));
}

// ============================================================
// Analytics (separate from Dashboard for 30d view)
// ============================================================
function AnalyticsView() {
  const trend30 = [88,85,90,91,87,84,86,89,92,90,88,85,87,86,82,79,81,83,86,88,90,87,85,83,81,79,80,84,87,87];
  const max = Math.max(...trend30);
  const heatmap = [
    [0,0,1,2,1,0,0],
    [0,1,2,3,2,1,0],
    [1,2,3,4,2,1,0],
    [1,2,2,3,1,0,0],
  ];
  const bins = (n) => n === 0 ? 'h0' : n === 1 ? 'h1' : n === 2 ? 'h2' : n === 3 ? 'h3' : 'h4';
  const topFails = [
    { name: 'TC-CHECK-001 · Checkout happy path',    fails: 8, pct: 80 },
    { name: 'TC-SEARCH-008 · Recents on second tap', fails: 6, pct: 60 },
    { name: 'TC-CHECK-004 · CVV field loses focus',  fails: 5, pct: 50 },
    { name: 'TC-PAY-014 · payment-method-add',       fails: 5, pct: 50 },
    { name: 'TC-PUSH-001 · Deep link from push',     fails: 4, pct: 40 },
    { name: 'TC-CART-011 · Qty stepper double-fires',fails: 3, pct: 30 },
  ];
  const gaps = [
    { cat: 'Payments',       have: 8, total: 12, gap: 'delete-card on Android' },
    { cat: 'Push',           have: 4, total: 8,  gap: 'multi-channel deep links' },
    { cat: 'Order tracking', have: 6, total: 9,  gap: 'cancel before ship · refund' },
    { cat: 'Settings',       have: 3, total: 6,  gap: 'privacy export · 2 paths' },
  ];

  const head = ViewHead({
    icon: '⌘2', name: 'Overview', meta: state.project + ' · trends + coverage',
    tabs: [
      { label: 'Today', onClick: () => navigate('dashboard') },
      { label: '7d' },
      { label: '30d', active: true },
      { label: 'All' },
    ],
    actions: vbtnGroup(vbtn('Compare to last 30d'), vbtn('Export report', { primary: true })),
  });

  const dash = h('div', { class: 'dashboard' });
  const hero = h('div', { class: 'hero-strip' });
  // Big card with 30d trend
  const bigCard = h('div', { class: 'hero-card big' },
    h('div', { class: 'lbl' }, 'Pass rate · 30d avg'),
    h('div', { class: 'num' }, '86', h('span', { class: 'unit' }, '%')),
    h('div', { class: 'delta up' }, '▲ 2 pts vs prior 30d'),
  );
  const trendEl = h('div', { class: 'trend30' });
  for (const v of trend30) {
    trendEl.append(h('i', {
      class: v >= 88 ? 'ok' : v >= 82 ? 'warn' : 'fail',
      style: { height: ((v / max) * 100) + '%' },
    }));
  }
  bigCard.append(trendEl);
  hero.append(bigCard);
  hero.append(
    h('div', { class: 'hero-card' }, h('div', { class: 'lbl' }, 'Mean time to detect'), h('div', { class: 'num' }, '3m', h('span', { class: 'unit' }, '12s')), h('div', { class: 'delta up' }, '▼ 48s vs prior')),
    h('div', { class: 'hero-card' }, h('div', { class: 'lbl' }, 'Healing success'), h('div', { class: 'num' }, '14', h('span', { class: 'unit' }, '/16')), h('div', { class: 'delta up' }, '88% accept rate')),
    h('div', { class: 'hero-card' }, h('div', { class: 'lbl' }, 'Agent spend · 30d'), h('div', { class: 'num' }, '$8.40'), h('div', { class: 'delta' }, 'avg $0.028/run · 286 runs')),
    h('div', { class: 'hero-card' }, h('div', { class: 'lbl' }, 'Coverage gap'), h('div', { class: 'num warnc' }, '9'), h('div', { class: 'delta' }, 'untested paths proposed')),
  );
  dash.append(hero);

  // Heatmap + top fails row
  const grid1 = h('div', { class: 'dash-grid' });
  const heatCard = h('div', { class: 'dash-card' },
    h('div', { class: 'dash-h' },
      h('span', { class: 't' }, 'Flake heatmap · 4 weeks'),
      h('span', { class: 'grow' }),
      h('span', { class: 'sub' }, 'cell = unique flaking tests/day'),
    ),
  );
  const hmWrap = h('div', { class: 'heatmap' });
  const labels = h('div', { class: 'hm-rowlabels' });
  for (const l of ['4 wk ago', '3 wk ago', '2 wk ago', '1 wk ago']) labels.append(h('span', null, l));
  hmWrap.append(labels);
  const hmGrid = h('div', { class: 'hm-grid' });
  for (const row of heatmap) {
    const r = h('div', { class: 'hm-row' });
    for (const v of row) r.append(h('div', { class: 'hm-cell ' + bins(v), title: v + ' flakes' }, v > 0 ? v : ''));
    hmGrid.append(r);
  }
  hmWrap.append(hmGrid);
  const colLabels = h('div', { class: 'hm-collabels' });
  for (const d of ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']) colLabels.append(h('span', null, d));
  hmWrap.append(colLabels);
  hmWrap.append(h('div', { class: 'hm-legend' },
    h('span', null, 'fewer'),
    h('span', { class: 'hm-cell h0' }), h('span', { class: 'hm-cell h1' }),
    h('span', { class: 'hm-cell h2' }), h('span', { class: 'hm-cell h3' }), h('span', { class: 'hm-cell h4' }),
    h('span', null, 'more'),
  ));
  heatCard.append(hmWrap);
  grid1.append(heatCard);

  const failCard = h('div', { class: 'dash-card' },
    h('div', { class: 'dash-h' },
      h('span', { class: 't' }, 'Top failing tests · 30d'),
      h('span', { class: 'grow' }),
      h('span', { class: 'sub' }, 'by fail rate'),
    ),
  );
  const topfails = h('div', { class: 'topfails' });
  for (const t of topFails) {
    topfails.append(h('div', { class: 'tf-row' },
      h('span', { class: 'tf-name' }, t.name),
      h('div', { class: 'tf-bar' }, h('div', { class: 'fill', style: { width: t.pct + '%' } })),
      h('span', { class: 'tf-num' }, t.fails, ' ', h('span', { class: 'tf-sub' }, '/' + Math.round(t.fails / (t.pct / 100)) + ' runs')),
    ));
  }
  failCard.append(topfails);
  grid1.append(failCard);
  dash.append(grid1);

  // Coverage gaps
  const grid2 = h('div', { class: 'dash-grid bottom' });
  const gapCard = h('div', { class: 'dash-card' },
    h('div', { class: 'dash-h' },
      h('span', { class: 't' }, 'Coverage gaps · agent-proposed'),
      h('span', { class: 'grow' }),
      h('span', { class: 'sub' }, 'close with ', h('code', null, '/coverage-gap')),
    ),
  );
  const gapsList = h('div', { class: 'gaps-list' });
  for (const g of gaps) {
    gapsList.append(h('div', { class: 'gap-row' },
      h('span', { class: 'cat' }, g.cat),
      h('div', { class: 'gap-bar' },
        h('div', { class: 'fill ok',   style: { width: ((g.have / g.total) * 100) + '%' } }),
        h('div', { class: 'fill miss', style: { width: (((g.total - g.have) / g.total) * 100) + '%' } }),
      ),
      h('span', { class: 'cat', style: { color: 'var(--fg-muted)', fontSize: '11.5px', fontWeight: 400 } }, g.have + '/' + g.total + ' · ' + g.gap),
    ));
  }
  gapCard.append(gapsList);
  grid2.append(gapCard);
  dash.append(grid2);

  // Banner first, then the dashboard content
  return wrappedView(head, h('div', { class: 'view-body' },
    PreviewBanner({ what: 'Trend chart, heatmap, top-fails and coverage gaps are sample data.', why: 'Real analytics requires accumulating run history (E-014 loops + E-012 cost tracking).' }),
    dash));
}

// ============================================================
// Skills management view
// ============================================================
function SkillsView() {
  const installed = state.skills;
  const available = [
    { slash: '/perf',           desc: 'Run a flow N times and report cold-start, frame drop, and memory regression.', tools: ['runMaestroFlow', 'tailLog', 'classify'], cost: '~$0.50' },
    { slash: '/a11y',           desc: 'Walk a screen and audit against iOS / Android accessibility heuristics.',      tools: ['runMaestroFlow', 'captureScreenshot'],   cost: '~$0.30' },
    { slash: '/translate-flow', desc: 'Convert a human bug repro from a Loom or text into a Maestro YAML flow.',      tools: ['editFile', 'runMaestroFlow'],            cost: '~$0.45' },
  ];
  const head = ViewHead({
    icon: '/', name: 'Skills',
    meta: '~/.morbius/skills · ' + installed.length + ' enabled',
    tabs: [{ label: 'Installed', active: true }, { label: 'Marketplace' }, { label: 'Edit prompts' }],
    actions: vbtnGroup(vbtn('Reload'), vbtn('+ Author new', { primary: true })),
  });

  const wrap = h('div', { class: 'skills' });
  wrap.append(h('h2', null, 'Installed ',
    h('span', { class: 'sub' }, '— invoke from chat with ', h('code', { style: { fontFamily: 'var(--font-mono)' } }, '/'))));
  const grid = h('div', { class: 'skill-grid' });
  for (const s of installed) {
    grid.append(h('div', { class: 'skill-card' },
      h('div', { class: 'head' },
        h('span', { class: 'slash' }, h('span', { class: 'dim' }, '/'), s.slash.slice(1)),
        h('span', { class: 'grow' }),
        h('span', { class: 'switch' }),
      ),
      h('div', { class: 'desc' }, s.desc),
      h('div', { class: 'tools' }, ...(s.tools || []).map(t => h('span', { class: 'tk' }, t))),
      h('div', { class: 'foot' },
        h('span', null, '— runs'),
        h('span', null, '·'),
        h('span', null, 'cost ' + s.cost),
        h('span', { class: 'grow' }),
        h('span', { class: 'edit', onClick: () => m.openDataFolder() }, 'edit ↗'),
      ),
    ));
  }
  wrap.append(grid);

  wrap.append(h('h2', null, 'From marketplace ',
    h('span', { class: 'sub' }, '— curated templates (preview only in v0.1)')));
  const grid2 = h('div', { class: 'skill-grid marketplace' });
  for (const s of available) {
    grid2.append(h('div', { class: 'skill-card' },
      h('div', { class: 'head' },
        h('span', { class: 'slash' }, h('span', { class: 'dim' }, '/'), s.slash.slice(1)),
        h('span', { class: 'grow' }),
        h('span', { class: 'install' }, 'Install'),
      ),
      h('div', { class: 'desc' }, s.desc),
      h('div', { class: 'tools' }, ...s.tools.map(t => h('span', { class: 'tk' }, t))),
      h('div', { class: 'foot' },
        h('span', null, s.cost),
        h('span', { class: 'grow' }),
        h('span', { class: 'edit' }, 'preview ↗'),
      ),
    ));
  }
  wrap.append(grid2);
  // The 5 installed skill cards read real metadata from ~/.morbius/skills/*.md,
  // but the on/off switches, Edit ↗ links, and marketplace tiles are not wired.
  return wrappedView(head, h('div', { class: 'view-body' },
    PreviewBanner({ what: 'Skill switches, Edit ↗, and Marketplace install are not wired.', why: 'Installed-skill list is real (reads ~/.morbius/skills). Wiring lands with E-013 + E-010.' }),
    h('div', { style: { flex: '1', minHeight: '0', overflow: 'auto' } }, wrap)));
}

// ============================================================
// MCP servers view
// ============================================================
function McpView() {
  // Lazy-load on first navigation
  if (!state.mcpLoaded && !state.mcpLoading) {
    state.mcpLoading = true;
    setTimeout(async () => {
      const r = await m.mcpList();
      state.mcpServers = r?.servers || [];
      state.mcpConfigPath = r?.configPath || '';
      state.mcpLoaded = true;
      state.mcpLoading = false;
      renderApp();
    }, 0);
  }

  const servers = state.mcpServers || [];
  const totalTools = servers.reduce((acc, s) => acc + (s.tools || 0), 0);

  const head = ViewHead({
    icon: '⌘⇧M', name: 'MCP servers',
    meta: servers.length + ' configured · ' + totalTools + ' tools registered',
    actions: vbtnGroup(
      vbtn('Open config', { onClick: async () => { const r = await m.mcpOpenConfig(); setToast('Edit: ' + (r?.path || '~/.morbius/mcp.json')); m.openDataFolder(); } }),
      vbtn('Reload', { primary: true, onClick: async () => {
        setToast('Reloading MCP servers…');
        state.mcpLoaded = false; state.mcpServers = []; renderApp();
        const r = await m.mcpReload();
        state.mcpServers = r?.servers || []; state.mcpLoaded = true;
        setToast('MCP servers reloaded');
        renderApp();
      } }),
    ),
  });

  const list = h('div', { class: 'mcp-list' });

  if (state.mcpLoading || !state.mcpLoaded) {
    list.append(h('div', { style: { padding: '40px', textAlign: 'center', color: 'var(--fg-dim)' } }, 'Loading MCP server state…'));
  } else if (servers.length === 0) {
    list.append(h('div', { style: { padding: '40px', textAlign: 'center', color: 'var(--fg-dim)' } },
      'No MCP servers configured. Click "Open config" to edit ',
      h('code', null, '~/.morbius/mcp.json'), '.'));
  } else {
    for (const s of servers) {
      const dotCls = s.status === 'ok' ? 'ok' : s.status === 'disabled' ? '' : 'warn';
      list.append(h('div', { class: 'mcp-row' },
        h('div', { class: 'dot-wrap' }, h('span', { class: 'dot ' + dotCls })),
        h('div', { class: 'info' },
          h('div', { class: 'n' }, h('code', null, s.id),
            h('span', { class: 'ver' }, s.status === 'ok' ? 'live' : s.status)),
          h('div', { class: 'src' }, s.source || '—'),
          s.error ? h('div', { class: 'src', style: { color: 'var(--fail)', marginTop: '2px' } }, s.error) : null,
        ),
        h('div', { class: 'tools-c' }, s.tools + ' tools'),
        h('div', { class: 'tools-c' }, s.status === 'ok' ? 'healthy' : s.status === 'disabled' ? 'off' : 'failed'),
        h('div', { class: 'acts' },
          h('button', { class: 'btn-sm ghost', onClick: () => m.openDataFolder() }, 'Edit'),
        ),
      ));
    }
  }
  list.append(h('button', { class: 'add-mcp', onClick: async () => { await m.mcpOpenConfig(); m.openDataFolder(); } },
    '+ Add MCP server (edits ' + (state.mcpConfigPath || '~/.morbius/mcp.json') + ')'));

  return wrappedView(head, h('div', { class: 'view-panel' }, list));
}

// ============================================================
// Bug detail drawer
// ============================================================
// ============================================================
// Approvals view (E-015)
// ============================================================
function ApprovalsView() {
  if (state.approvals == null && !state.approvalsLoading) {
    state.approvalsLoading = true;
    setTimeout(async () => {
      const r = await m.approvalsList();
      state.approvals = r?.items || [];
      state.approvalsLoading = false;
      renderApp();
    }, 0);
  }
  const items = state.approvals || [];
  const head = ViewHead({
    icon: '⌘⇧A', name: 'Approvals queue',
    meta: items.length + ' pending',
    actions: vbtnGroup(
      vbtn('Refresh', { onClick: async () => { const r = await m.approvalsList(); state.approvals = r?.items || []; renderApp(); } }),
      vbtn('Clear all', { onClick: async () => { await m.approvalsClear(); state.approvals = []; setToast('Queue cleared'); renderApp(); } }),
      vbtn('Approve all', { primary: true, onClick: async () => {
        for (const it of items) await m.approvalsResolve({ id: it.id, decision: 'allow' });
        state.approvals = []; setToast('Approved ' + items.length); renderApp();
      } }),
    ),
  });
  const list = h('div', { class: 'view-panel' });
  if (state.approvalsLoading) {
    list.append(h('div', { style: { color: 'var(--fg-dim)', padding: '40px', textAlign: 'center' } }, 'Loading…'));
  } else if (items.length === 0) {
    list.append(h('div', { style: { color: 'var(--fg-dim)', padding: '40px', textAlign: 'center' } },
      'No pending approvals.',
      h('div', { style: { fontSize: '12px', marginTop: '8px' } },
        'When the permission mode is set to ', h('code', null, 'batch'), ', tool calls land here for bulk review.')));
  } else {
    for (const it of items) {
      list.append(h('div', { class: 'cred-card' },
        h('div', { class: 'cred-title' }, it.tool),
        h('div', { class: 'cred-mask', style: { fontFamily: 'var(--font-mono)', fontSize: '11px' } },
          truncate(JSON.stringify(it.args || {}), 200)),
        h('div', { class: 'cred-meta' }, (it.reasoning || '(no reasoning)') + ' · ' + (it.ts || '')),
        h('div', { class: 'cred-actions' },
          h('button', { class: 'btn-sm primary', onClick: async () => {
            await m.approvalsResolve({ id: it.id, decision: 'allow' });
            state.approvals = items.filter(x => x.id !== it.id);
            renderApp();
          } }, 'Approve'),
          h('button', { class: 'btn-sm ghost', onClick: async () => {
            await m.approvalsResolve({ id: it.id, decision: 'deny' });
            state.approvals = items.filter(x => x.id !== it.id);
            renderApp();
          } }, 'Deny'),
        ),
      ));
    }
  }
  return wrappedView(head, list);
}

function openBugDrawer(b) {
  state.bugDrawer = { ...b, _kind: 'bug' };
  state.bugDrawerBody = '';
  state.bugDrawerNotes = '';
  loadDrawerBody(b, 'bugs');
  renderApp();
}
function openTestDrawer(t) {
  // Reuse the same right-side drawer; mark _kind so the header shows the right label.
  state.bugDrawer = { ...t, _kind: 'test' };
  state.bugDrawerBody = '';
  state.bugDrawerNotes = '';
  loadDrawerBody(t, 'tests');
  renderApp();
}

async function loadDrawerBody(item, kind) {
  state.bugDrawerBodyLoading = true;
  try {
    // Construct absolute path: <repoRoot>/data/<project>/<kind>/<path-or-file>
    const rel = item.path || item.file || '';
    if (!rel || !state.repoRoot) {
      state.bugDrawerBody = '(no file path on item)';
    } else {
      const abs = state.repoRoot + '/data/' + state.project + '/' + kind + '/' + rel;
      const r = await m.toolCall({ tool: 'readFile', args: { filePath: abs }, projectId: state.project });
      const contents = r?.result?.contents || '';
      // Strip frontmatter (it's already shown in Linked/Frontmatter section)
      const end = contents.indexOf('\n---', 3);
      state.bugDrawerBody = end > 0 ? contents.slice(end + 4).trim() : contents.trim();
      if (!state.bugDrawerBody) state.bugDrawerBody = '(file has no body)';
    }
  } catch (e) {
    state.bugDrawerBody = 'Failed to load: ' + (e?.message || e);
  }
  state.bugDrawerBodyLoading = false;
  renderApp();
}
function closeBugDrawer() {
  state.bugDrawer = null;
  state.bugDrawerBody = '';
  state.bugDrawerBodyLoading = false;
  state.bugDrawerNotes = '';
  renderApp();
}
function BugDrawerOverlay() {
  if (!state.bugDrawer) return null;
  const b = state.bugDrawer;
  const isTest = b._kind === 'test';
  // For tests: severity comes from status (pass → green, fail → red, flaky → amber, else dim)
  let sev;
  if (isTest) {
    sev = /pass/i.test(b.status || '') ? 'p3'
        : /fail/i.test(b.status || '') ? 'p0'
        : /flak/i.test(b.status || '') ? 'p1' : 'p2';
  } else {
    sev = ((b.severity || 'p3').toLowerCase().match(/p\d/) || ['p3'])[0];
  }
  const id = (b.id || b.file || '').replace(/\.md$/, '');
  const statusLabel = b.status ? b.status.charAt(0).toUpperCase() + b.status.slice(1) : (isTest ? 'Not run' : 'Triage');
  const statusCls = /pass|closed|fixed|shipped/i.test(b.status || '') ? 'ok'
                    : /verify|flak/i.test(b.status || '') ? 'warn'
                    : /fail|investig|progress/i.test(b.status || '') ? 'fail' : 'warn';

  return h('div', { class: 'drawer-backdrop', onClick: closeBugDrawer },
    h('div', { class: 'drawer', onClick: e => e.stopPropagation(), onKeydown: e => { if (e.key === 'Escape') closeBugDrawer(); }, tabindex: '-1' },
      h('div', { class: 'dr-head' },
        h('span', { class: 'sev ' + sev }, isTest ? 'TC' : sev.toUpperCase()),
        h('span', { class: 'id' }, id),
        !isTest && (b.jira || /jira|ma-/i.test(b.file || '')) ? h('span', { class: 'j' }, 'J') : null,
        h('span', { class: 'grow' }),
        h('span', { class: 'icon-btn', title: 'Open in chat (prefill, do not auto-send)', onClick: () => {
          closeBugDrawer();
          navigate('chat');
          const prefill = (isTest ? '/explore ' : 'Explain ') + id;
          state.chatDraft = prefill;
          setTimeout(() => {
            const t = document.querySelector('.chat-input textarea');
            if (t) { t.value = prefill; autoSizeTextarea(t); t.focus(); }
          }, 80);
        } }, '↩'),
        h('span', { class: 'icon-btn', title: 'Copy link', onClick: () => { navigator.clipboard?.writeText(id); setToast('Copied ' + id); } }, '⎘'),
        h('span', { class: 'icon-btn', title: 'Close (Esc)', onClick: closeBugDrawer }, '✕'),
      ),
      h('div', { class: 'dr-title' }, b.title || (isTest ? 'Untitled test' : 'Untitled bug')),
      h('div', { class: 'dr-pillrow' },
        h('span', { class: 'status-pill ' + statusCls }, '● ', statusLabel),
        isTest && b.priority ? h('span', { class: 'pillk' }, b.priority) : null,
        isTest && b.category ? h('span', { class: 'pillk' }, b.category) : null,
        !isTest ? h('span', { class: 'pillk' }, 'filed ' + (b.created || 'recently')) : null,
        b.device ? h('span', { class: 'pillk' }, b.device) : null,
        b.build ? h('span', { class: 'pillk' }, b.build) : null,
      ),
      h('div', { class: 'dr-body' },
        !isTest ? h('div', { class: 'dr-shot' },
          h('div', { class: 'dr-shot-thumb ' + (sev === 'p0' || sev === 'p1' ? 'fail' : '') },
            h('div', { class: 'badge' }, b.step || 'fail step'),
          ),
          h('div', { class: 'dr-shot-meta' }, 'screenshots & run log attached via PMAgent (mocked)'),
        ) : null,
        h('div', { class: 'dr-section' },
          h('div', { class: 'lbl' }, isTest ? 'Frontmatter' : 'Linked'),
          h('div', { class: 'kvs' },
            isTest ? [
              h('span', { class: 'k' }, 'ID'),        h('span', { class: 'v' }, b.id || '—'),
              h('span', { class: 'k' }, 'Category'),  h('span', { class: 'v' }, b.category || (b.path && b.path.split('/')[0]) || '—'),
              h('span', { class: 'k' }, 'Scenario'),  h('span', { class: 'v' }, b.scenario || '—'),
              h('span', { class: 'k' }, 'Priority'),  h('span', { class: 'v' }, b.priority || '—'),
              h('span', { class: 'k' }, 'Status'),    h('span', { class: 'v' }, b.status || 'not run'),
              h('span', { class: 'k' }, 'File'),      h('span', { class: 'v' }, b.path || b.file || ''),
            ] : [
              h('span', { class: 'k' }, 'Test case'), h('span', { class: 'v' }, b.test || '—'),
              h('span', { class: 'k' }, 'Flow'),      h('span', { class: 'v' }, b.flow || '—'),
              h('span', { class: 'k' }, 'Run'),       h('span', { class: 'v' }, b.run || '—'),
              h('span', { class: 'k' }, 'Build'),     h('span', { class: 'v' }, b.build || '—'),
              h('span', { class: 'k' }, 'File'),      h('span', { class: 'v' }, b.file || ''),
            ],
          ),
        ),
        h('div', { class: 'dr-section' },
          h('div', { class: 'lbl' }, 'Body'),
          h('pre', {
            class: 'code-block',
            id: 'drawer-body-content',
            style: { whiteSpace: 'pre-wrap', fontSize: '12px', maxHeight: '40vh', overflow: 'auto' },
          }, state.bugDrawerBody || (state.bugDrawerBodyLoading ? 'Loading…' : '(open this item to load its body)')),
        ),
        h('div', { class: 'dr-section' },
          h('div', { class: 'lbl' }, 'Notes'),
          h('textarea', {
            rows: 4,
            placeholder: 'Notes (local-only, not persisted across launches yet)',
            style: { width: '100%', background: 'var(--bg-sunken)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--fg)', padding: '10px', fontFamily: 'var(--font-sans)', fontSize: '12.5px' },
            onInput: (e) => { state.bugDrawerNotes = e.target.value; },
          }, state.bugDrawerNotes || ''),
        ),
      ),
    ),
  );
}

// (Removed legacy panelView — all views now use ViewHead directly.)

function PermissionsView() {
  const p = state.permissions;
  return h('div', { class: 'chat' },
    h('div', { class: 'chat-head' }, h('span', { class: 'title' }, 'Permission Rules'), h('span', { class: 'grow' }), h('span', { class: 'kbd' }, '⌘⇧P')),
    h('div', { class: 'view-panel' },
      h('p', { class: 'sub' }, 'Mode: ', h('strong', null, p.mode)),
      h('div', { style: { display: 'flex', gap: '8px', marginBottom: '14px' } },
        ...['default', 'acceptEdits', 'plan', 'dryRun', 'batch', 'bypassPermissions'].map(mode =>
          h('button', { class: 'btn-sm ' + (p.mode === mode ? 'primary' : 'ghost'), onClick: () => setPermMode(mode) }, mode))),
      p.rules.length === 0 ? h('div', { class: 'sub' }, 'No persisted rules yet.') : null,
      ...p.rules.map((r, i) =>
        h('div', { class: 'row' },
          h('div', { style: { color: r.allow ? 'var(--ok)' : 'var(--fail)', fontSize: '14px' } }, r.allow ? '✓' : '✗'),
          h('div', null,
            h('div', { class: 'title' }, r.tool),
            h('div', { class: 'meta' }, (r.allow ? 'Always allow' : 'Always deny') + ' · ' + (r.created || '')),
          ),
          h('button', { class: 'btn-sm ghost', onClick: () => removePermRule(i) }, 'Remove'),
        )),
    ),
  );
}

const SETTINGS_SECTIONS = [
  { id: 'profile',      label: 'Profile' },
  { id: 'workspace',    label: 'Workspace' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'devices',      label: 'Devices' },
  { id: 'maestro',      label: 'Maestro' },
  { id: 'runs',         label: 'Test runs' },
  { id: 'appearance',   label: 'Appearance' },
  { id: 'permissions',  label: 'Permissions' },
  { id: 'data',         label: 'Data' },
  { id: 'danger',       label: 'Danger zone', danger: true },
];

function SettingsNav() {
  const active = state.settingsSection || 'appearance';
  const nav = h('div', { class: 'set-nav' });
  nav.append(h('div', { class: 'sn-section' }, 'Settings'));
  nav.append(h('div', { class: 'sn-search' },
    h('span', null, '⌕'),
    h('span', { class: 'grow' }, 'Search settings…'),
  ));
  for (const s of SETTINGS_SECTIONS) {
    nav.append(h('div', {
      class: 'sn-row ' + (s.id === active ? 'active' : '') + (s.danger ? ' danger' : ''),
      onClick: () => { state.settingsSection = s.id; renderApp(); },
    }, h('span', null, s.label)));
  }
  nav.append(h('div', { class: 'sn-foot' },
    h('div', { class: 'acct' },
      h('div', { class: 'ava' }, 'SD'),
      h('div', null,
        h('div', { class: 'n' }, 'Local user'),
        h('div', { class: 'e' }, 'morbius-mac · v0.1'),
      ),
    ),
    h('div', { class: 'sn-version' }, 'Morbius · 2026.05'),
  ));
  return nav;
}

function SettingsView() {
  const sec = state.settingsSection || 'appearance';
  const head = ViewHead({
    icon: '⌘,', name: SETTINGS_SECTIONS.find(s => s.id === sec)?.label || 'Settings',
    meta: 'changes save automatically',
    actions: vbtnGroup(vbtn('Reset to defaults')),
  });
  let body;
  if      (sec === 'appearance')   body = SettingsAppearance();
  else if (sec === 'integrations') body = SettingsIntegrations();
  else if (sec === 'permissions')  body = PermissionsBody();
  else if (sec === 'profile')      body = SettingsProfile();
  else if (sec === 'workspace')    body = SettingsWorkspace();
  else if (sec === 'devices')      body = SettingsDevices();
  else if (sec === 'maestro')      body = SettingsMaestro();
  else if (sec === 'runs')         body = SettingsRuns();
  else if (sec === 'data')         body = SettingsData();
  else if (sec === 'danger')       body = SettingsDanger();
  else body = SettingsAppearance();
  return wrappedView(head, h('div', { class: 'settings' }, body));
}

function SettingsAppearance() {
  const accents = [
    { name: 'Slate (current)', hex: '#e8eef5', active: true },
    { name: 'Orange', hex: '#D97757' },
    { name: 'Green',  hex: '#45E0A8' },
    { name: 'Amber',  hex: '#F5A623' },
    { name: 'Blue',   hex: '#4A90E2' },
    { name: 'Violet', hex: '#A78BFA' },
  ];
  return h('div', null,
    h('section', { class: 'set-section' },
      h('div', { class: 'sec-head' },
        h('div', null,
          h('div', { class: 'h' }, 'Theme'),
          h('div', { class: 'd' }, 'Pick a base. Morbius follows your system preference by default.'),
        ),
      ),
      h('div', { class: 'theme-row' },
        themeCard('Dark',  'dark',  state.theme === 'dark'),
        themeCard('Light', 'light', state.theme === 'light'),
        themeCard('Match system', 'sys', false),
        themeCard('Liquid glass', 'glass', true),
      ),
    ),
    h('section', { class: 'set-section' },
      h('div', { class: 'sec-head' },
        h('div', null,
          h('div', { class: 'h' }, 'Accent color ',
            h('span', { class: 'badge', style: { background: 'var(--warn)', color: '#1c1d1f', padding: '1px 6px', borderRadius: '3px', fontSize: '9.5px', fontFamily: 'var(--font-mono)', fontWeight: 600, marginLeft: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' } }, 'preview')),
          h('div', { class: 'd' }, 'Used for active rail indicator, send button, and the agent avatar dot. Swatches are previewing the design; only the current accent (Slate) is applied.'),
        ),
      ),
      h('div', { class: 'accent-picker' },
        ...accents.map(a =>
          h('div', { class: 'a-swatch ' + (a.active ? 'active' : '') },
            h('span', { class: 'dot', style: { background: a.hex } }),
            h('span', { class: 'n' }, a.name),
            h('span', { class: 'hex' }, a.hex),
          )),
      ),
    ),
    h('section', { class: 'set-section' },
      h('div', { class: 'sec-head' },
        h('div', null,
          h('div', { class: 'h' }, 'Density'),
          h('div', { class: 'd' }, 'Affects row heights and padding across lists.'),
        ),
        h('div', { class: 'seg-ctrl' },
          h('span', null, 'Compact'),
          h('span', { class: 'on' }, 'Comfortable'),
          h('span', null, 'Sparse'),
        ),
      ),
    ),
    h('section', { class: 'set-section' },
      h('div', { class: 'sec-head' },
        h('div', null,
          h('div', { class: 'h' }, 'Activity rail'),
          h('div', { class: 'd' }, "Where the agent's tool stream appears."),
        ),
      ),
      toggleRow('Auto-collapse when chat receives a reply', true),
      toggleRow('Pulse the badge when a tool needs permission', true),
      toggleRow('Group cards by minute', false),
      toggleRow('Show $ cost on each card', true),
    ),
    h('div', { class: 'sec-tail' }, 'Changes save automatically · last saved 4s ago ✓'),
  );
}
function themeCard(label, kind, active) {
  return h('div', { class: 'th-card ' + (active ? 'active' : ''), onClick: () => selectTheme(kind) },
    h('div', { class: 'prev ' + kind }),
    h('div', { class: 'lbl' }, h('span', { class: 'radio ' + (active ? 'on' : '') }), label),
  );
}

function selectTheme(kind) {
  // 'dark' / 'light' set theme directly; 'sys' follows OS preference; 'glass' is a layered
  // dark variant (the Liquid Glass styles always apply to dark theme right now).
  if (kind === 'sys') {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    state.theme = (mq && mq.matches) ? 'dark' : 'light';
    try { localStorage.setItem('morbius:theme', state.theme); } catch {}
  } else if (kind === 'dark' || kind === 'glass') {
    state.theme = 'dark';
    try { localStorage.setItem('morbius:theme', 'dark'); } catch {}
  } else if (kind === 'light') {
    state.theme = 'light';
    try { localStorage.setItem('morbius:theme', 'light'); } catch {}
  }
  // Re-init mermaid for the new theme + invalidate cached AppMap SVG
  state.appMapMermaidInit = false;
  if (state.appMapSource) { state.appMapSvg = ''; loadAppMap(); }
  else renderApp();
}
function toggleRow(label, on) {
  return h('div', { class: 'toggle-row' }, h('span', null, label), h('span', { class: 'switch ' + (on ? 'on' : '') }));
}

function SettingsIntegrations() {
  const services = [
    { name: 'PMAgent', acct: 'local stub · sibling repo', scope: 'read · write', state: 'ok' },
    { name: 'Jira',    acct: 'not connected',             scope: 'issues',       state: 'off' },
    { name: 'GitHub',  acct: state.probes.find(p => p.id === 'github-pat')?.ok ? 'GITHUB_TOKEN env' : 'not configured', scope: 'repo', state: state.probes.find(p => p.id === 'github-pat')?.ok ? 'ok' : 'warn' },
    { name: 'Slack',   acct: 'not connected', scope: '—',  state: 'off' },
    { name: 'Anthropic', acct: state.probes.find(p => p.id === 'anthropic-key')?.ok ? 'ANTHROPIC_API_KEY env' : 'not configured', scope: 'agent',
      state: state.probes.find(p => p.id === 'anthropic-key')?.ok ? 'ok' : 'warn' },
  ];
  return h('div', null,
    PreviewBanner({ what: 'Connect/Manage buttons for Jira, Slack, GitHub OAuth, PMAgent are not wired.', why: 'Real connections ship with E-002 (GitHub/Supabase) and E-005 (PMAgent). Anthropic key onboarding is real.' }),
    h('section', { class: 'set-section' },
      h('div', { class: 'sec-head' }, h('div', null, h('div', { class: 'h' }, 'Connected services'), h('div', { class: 'd' }, 'Sync, auth, and agent endpoints. Status reflects env probes.'))),
      h('div', { class: 'int-grid' },
        ...services.map(s =>
          h('div', { class: 'int-card ' + s.state },
            h('div', { class: 'mono' }, s.name[0]),
            h('div', { class: 'grow' },
              h('div', { class: 'n' }, s.name),
              h('div', { class: 'a' }, s.acct),
              h('div', { class: 'sc' }, s.scope),
            ),
            h('button', { class: 'btn-sm ghost' }, s.state === 'off' ? 'Connect' : 'Manage'),
          ),
        ),
      ),
    ),
    h('section', { class: 'set-section' },
      h('div', { class: 'sec-head' }, h('div', null, h('div', { class: 'h' }, 'MCP servers'), h('div', { class: 'd' }, 'Model Context Protocol servers extend the agent\'s tool surface.'))),
      h('div', { class: 'cred-card' },
        h('div', { class: 'cred-title' }, '~/.morbius/mcp.json'),
        h('div', { class: 'cred-meta' }, '3 built-in · 0 user-installed'),
        h('div', { class: 'cred-actions' },
          h('button', { class: 'btn-sm primary', onClick: () => navigate('mcp') }, 'Manage'),
          h('button', { class: 'btn-sm ghost', onClick: () => m.openDataFolder() }, 'Open folder'),
        ),
      ),
    ),
  );
}

function PermissionsBody() {
  const p = state.permissions;
  return h('div', null,
    h('section', { class: 'set-section' },
      h('div', { class: 'sec-head' },
        h('div', null,
          h('div', { class: 'h' }, 'Permission mode'),
          h('div', { class: 'd' }, 'How aggressively the agent asks before running tools.'),
        ),
        h('div', { class: 'seg-ctrl' },
          ...['default', 'acceptEdits', 'plan', 'dryRun', 'batch', 'bypassPermissions'].map(mode =>
            h('span', { class: p.mode === mode ? 'on' : '', onClick: () => setPermMode(mode) }, mode)),
        ),
      ),
    ),
    h('section', { class: 'set-section' },
      h('div', { class: 'sec-head' }, h('div', null, h('div', { class: 'h' }, 'Persisted rules · ' + p.rules.length), h('div', { class: 'd' }, "Always-allow / always-deny rules you've created from prompts."))),
      p.rules.length === 0 ? h('div', { class: 'd', style: { padding: '8px 0' } }, 'No rules yet — they appear here when you pick "Always allow" or "Always deny" in a prompt.') :
      h('div', { class: 'perm-table' },
        ...p.rules.map((r, i) =>
          h('div', { class: 'perm-trow' },
            h('span', { style: { color: r.allow ? 'var(--ok)' : 'var(--fail)' } }, r.allow ? '✓ allow' : '✗ deny'),
            h('span', { class: 'mono' }, r.tool),
            h('span', { style: { color: 'var(--fg-muted)', fontSize: '11px' } }, r.created || ''),
            h('button', { class: 'btn-sm ghost', onClick: () => removePermRule(i) }, 'Remove'),
          )),
      ),
    ),
  );
}

function SettingsProfile() {
  return h('section', { class: 'set-section' },
    h('div', { class: 'sec-head' }, h('div', null, h('div', { class: 'h' }, 'Profile'), h('div', { class: 'd' }, 'Local-only — no account system in v0.1.'))),
    h('div', { class: 'cred-card' },
      h('div', { class: 'cred-title' }, 'Display name'),
      h('div', { class: 'cred-meta' }, 'Used in conversation history.'),
      h('div', { class: 'cred-actions' }, h('button', { class: 'btn-sm primary' }, 'Edit')),
    ),
  );
}
function SettingsWorkspace() {
  return h('section', { class: 'set-section' },
    h('div', { class: 'sec-head' }, h('div', null, h('div', { class: 'h' }, 'Active project'), h('div', { class: 'd' }, state.project))),
    h('div', { class: 'cred-card' },
      h('div', { class: 'cred-title' }, 'Data folder'),
      h('div', { class: 'cred-meta' }, 'Conversations + activity + permissions for this workspace.'),
      h('div', { class: 'cred-actions' }, h('button', { class: 'btn-sm primary', onClick: () => m.openDataFolder() }, 'Reveal')),
    ),
    h('div', { class: 'cred-card' },
      h('div', { class: 'cred-title' }, 'Switch project'),
      h('div', { class: 'cred-meta' }, (state.projects || []).length + ' projects available'),
      h('div', { class: 'cred-actions' }, h('button', { class: 'btn-sm primary', onClick: () => openProjectSwitcher() }, 'Switch…')),
    ),
  );
}
function SettingsDevices() {
  return h('section', { class: 'set-section' },
    h('div', { class: 'sec-head' }, h('div', null, h('div', { class: 'h' }, 'Devices'), h('div', { class: 'd' }, state.devices.length + ' detected on this Mac'))),
    h('div', null,
      ...state.devices.map(d =>
        h('div', { class: 'cred-card' },
          h('div', { class: 'cred-title' }, d.name),
          h('div', { class: 'cred-meta' }, d.platform + ' · ' + (d.os || '') + ' · ' + d.state),
        )),
    ),
  );
}
function SettingsMaestro() {
  const probe = state.probes.find(p => p.id === 'maestro');
  return h('section', { class: 'set-section' },
    h('div', { class: 'sec-head' }, h('div', null, h('div', { class: 'h' }, 'Maestro CLI'), h('div', { class: 'd' }, probe?.detail || 'not detected'))),
    h('div', { class: 'cred-card' },
      h('div', { class: 'cred-title' }, 'Binary path'),
      h('div', { class: 'cred-meta' }, probe?.ok ? 'Detected on PATH' : 'Install via curl ... | bash'),
      h('div', { class: 'cred-actions' },
        h('button', { class: 'btn-sm primary', onClick: () => m.openExternal('https://docs.maestro.dev/getting-started/installing-maestro') }, 'Install help'),
        h('button', { class: 'btn-sm ghost', onClick: () => runOneProbe('maestro') }, 'Re-verify'),
      ),
    ),
  );
}
function SettingsRuns() {
  return h('section', { class: 'set-section' },
    h('div', { class: 'sec-head' }, h('div', null, h('div', { class: 'h' }, 'Test runs'), h('div', { class: 'd' }, 'Defaults for /smoke and ad-hoc runs.'))),
    toggleRow('Auto-screenshot on assertion failure', true),
    toggleRow('Upload screenshots to Supabase', false),
    toggleRow('Halt suite on first P0 failure', false),
    toggleRow('Notify on suite complete', true),
  );
}
function SettingsData() {
  return h('section', { class: 'set-section' },
    h('div', { class: 'sec-head' }, h('div', null, h('div', { class: 'h' }, 'Local data'), h('div', { class: 'd' }, 'Conversations, activity log, permission audit.'))),
    h('div', { class: 'cred-card' },
      h('div', { class: 'cred-title' }, 'Export conversations'),
      h('div', { class: 'cred-meta' }, 'All JSONL files for the active project.'),
      h('div', { class: 'cred-actions' }, h('button', { class: 'btn-sm primary', onClick: () => m.openDataFolder() }, 'Reveal in Finder')),
    ),
  );
}
function SettingsDanger() {
  return h('section', { class: 'set-section' },
    h('div', { class: 'sec-head' }, h('div', null, h('div', { class: 'h', style: { color: 'var(--fail)' } }, 'Danger zone'), h('div', { class: 'd' }, 'Destructive actions with no undo.'))),
    h('div', { class: 'cred-card', style: { borderColor: 'rgba(248,113,113,0.4)' } },
      h('div', { class: 'cred-title' }, 'Reset onboarding'),
      h('div', { class: 'cred-meta' }, 'Re-trigger the welcome flow on next launch.'),
      h('div', { class: 'cred-actions' },
        h('button', { class: 'btn-sm', onClick: () => {
          localStorage.removeItem('morbius:onboarded');
          state.showOnboarding = true;
          state.onboardingStep = 0;
          setToast('Onboarding restarted');
          renderApp();
        } }, 'Reset & restart'),
      ),
    ),
    h('div', { class: 'cred-card', style: { borderColor: 'rgba(248,113,113,0.4)' } },
      h('div', { class: 'cred-title' }, 'Clear all conversations'),
      h('div', { class: 'cred-meta' }, "Deletes every conversation in this project's data dir."),
      h('div', { class: 'cred-actions' }, h('button', { class: 'btn-sm', onClick: () => setToast('Not implemented in v0.1') }, 'Clear')),
    ),
  );
}

function credCard({ title, masked, meta, kind }) {
  return h('div', { class: 'cred-card' },
    h('div', { class: 'cred-title' }, title),
    h('div', { class: 'cred-mask' }, masked),
    h('div', { class: 'cred-meta' }, meta),
    h('div', { class: 'cred-actions' },
      h('button', { class: 'btn-sm primary',
                    onClick: () => promptForCredential(kind) }, 'Replace'),
      h('button', { class: 'btn-sm ghost',
                    onClick: () => m.openExternal(kind === 'anthropic' ? 'https://console.anthropic.com' : 'https://github.com/settings/tokens') },
        'Open vendor'),
    ),
  );
}

function promptForCredential(kind) {
  const v = window.prompt('Paste your ' + kind + ' credential (stored locally only — restart to apply)');
  if (!v) return;
  setToast('Credential stored locally. Restart to apply.');
  // Persist to a sidecar file so the env probe can read it on next launch
  m.toolCall({ tool: 'writeFile', args: {
    filePath: (kind === 'anthropic' ? '~/.morbius/.anthropic_key' : '~/.morbius/.github_pat').replace('~', state.home || ''),
    contents: v,
  } });
}

// ============================================================
// Onboarding
// ============================================================
function OnboardingView() {
  const steps = ['Welcome', 'Anthropic key', 'GitHub PAT', 'Doctor', 'Done'];
  const idx = state.onboardingStep || 0;
  let content;
  if (idx === 0) {
    content = h('div', null,
      h('h1', null, "Hi. I'm Morbius."),
      h('p', null, "I run your QA with an embedded AI agent. Let's get set up — takes about a minute. You can skip anything that needs an external account; the app runs in local-mock mode if you do."),
    );
  } else if (idx === 1) {
    content = h('div', null,
      h('h1', null, 'Anthropic API key'),
      h('p', null, "Optional for v0.1 — without it the agent runs deterministic local scripts. Paste your key to enable the real agent loop."),
      h('input', { type: 'password', placeholder: 'sk-ant-…', id: 'onb-anthropic' }),
    );
  } else if (idx === 2) {
    content = h('div', null,
      h('h1', null, 'GitHub PAT'),
      h('p', null, "Optional. Needs ", h('code', null, 'repo'), " scope. Without it, ", h('code', null, 'commitToGithub'), " returns mocked success."),
      h('input', { type: 'password', placeholder: 'ghp_…', id: 'onb-github' }),
    );
  } else if (idx === 3) {
    content = h('div', null,
      h('h1', null, 'Environment'),
      h('p', null, "Probing your machine for the QA toolchain — Xcode CLI, Android SDK, JDK, Maestro. You can skip any reds; the agent will offer to install them on demand."),
      h('div', { style: { marginTop: '14px' } },
        ...state.probes.map(p =>
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', fontSize: '12.5px' } },
            h('span', { style: { width: '8px', height: '8px', borderRadius: '50%', background: p.ok ? 'var(--ok)' : 'var(--fail)' } }),
            h('span', null, probeTitle(p.id)),
            h('span', { style: { color: 'var(--fg-muted)', fontSize: '11px', marginLeft: 'auto' } }, p.detail || (p.ok ? 'ok' : 'missing')),
          )),
      ),
    );
  } else {
    content = h('div', null,
      h('h1', null, "You're ready."),
      h('p', null, "Press ", h('code', null, '/'), " to see skills. Try ", h('code', null, '/smoke'), " against a booted device, or ask the agent anything about your QA setup."),
    );
  }
  return h('div', { class: 'chat' },
    h('div', { class: 'chat-head' }, h('span', { class: 'title' }, 'Welcome'), h('span', { class: 'grow' })),
    h('div', { class: 'onboarding' },
      h('div', { class: 'card' },
        h('div', { class: 'step-dots' },
          ...steps.map((_, i) => h('div', { class: 'dot' + (i === idx ? ' active' : '') })),
        ),
        content,
        h('div', { class: 'actions' },
          h('button', { class: 'btn-sm ghost', onClick: () => finishOnboarding() }, 'Skip'),
          idx < steps.length - 1
            ? h('button', { class: 'btn-sm primary', onClick: () => nextOnboardingStep() }, 'Next →')
            : h('button', { class: 'btn-sm primary', onClick: () => finishOnboarding() }, 'Open chat'),
        ),
      ),
    ),
  );
}

async function nextOnboardingStep() {
  const idx = state.onboardingStep || 0;
  if (idx === 1) {
    const v = document.getElementById('onb-anthropic')?.value;
    if (v) {
      await m.toolCall({ tool: 'writeFile', args: {
        filePath: (state.home || '') + '/.morbius/.anthropic_key',
        contents: v.trim(),
      }, projectId: state.project });
      setToast('Anthropic key saved to ~/.morbius/.anthropic_key');
    }
  }
  if (idx === 2) {
    const v = document.getElementById('onb-github')?.value;
    if (v) {
      await m.toolCall({ tool: 'writeFile', args: {
        filePath: (state.home || '') + '/.morbius/.github_pat',
        contents: v.trim(),
      }, projectId: state.project });
      setToast('GitHub PAT saved to ~/.morbius/.github_pat');
    }
  }
  state.onboardingStep = idx + 1;
  if (state.onboardingStep === 3) await refreshProbes();
  renderApp();
}
async function finishOnboarding() {
  localStorage.setItem('morbius:onboarded', '1');
  state.view = 'chat';
  state.showOnboarding = false;
  renderApp();
}

// ============================================================
// Layout
// ============================================================
// Views that render entirely solo (no conv sidebar, no rail) — navrail + main
const VIEWS_SOLO = new Set(['doctor', 'permissions', 'mcp', 'skills', 'approvals']);
// Settings uses its own custom set-nav instead of the conv sidebar
const VIEWS_CUSTOM_SIDEBAR = new Set(['settings']);
// Views without the activity rail (everything except chat)
const VIEWS_WITH_RAIL = new Set(['chat']);
// View → builder
const VIEW_BUILDERS = {
  chat:        ChatPane,
  dashboard:   DashboardView,
  tests:       TestsView,
  bugs:        BugsView,
  devices:     DevicesView,
  runs:        RunsView,
  flows:       FlowsView,
  appmap:      AppMapView,
  healing:     HealingView,
  skills:      SkillsView,
  doctor:      DoctorView,
  permissions: PermissionsView,
  mcp:         McpView,
  settings:    SettingsView,
  liverun:     LiveRunView,
  analytics:   AnalyticsView,
  approvals:   ApprovalsView,
};

function App() {
  const win = h('div', { class: 'mac-window theme-' + state.theme });
  win.append(TitleBar());

  if (state.showOnboarding) {
    win.append(h('div', { class: 'body bare' }, OnboardingView()));
    if (state.toast) win.append(h('div', { class: 'toast' }, state.toast));
    return win;
  }

  // Body grid:
  //   chat                                 → navrail + sidebar + chat + rail  (.body)
  //   doctor/permissions/mcp/skills        → navrail +           chat          (.body solo)
  //   settings                             → navrail + set-nav + chat          (.body no-rail, custom sidebar)
  //   everything else (dashboard, etc.)    → navrail + sidebar + chat          (.body no-rail)
  const viewId = state.view;
  let bodyClass;
  if (viewId === 'chat')               bodyClass = 'body';
  else if (VIEWS_SOLO.has(viewId))     bodyClass = 'body solo';
  else                                  bodyClass = 'body no-rail';
  const body = h('div', { class: bodyClass });

  // NavRail always first
  body.append(NavRail());

  // Sidebar slot
  if (VIEWS_CUSTOM_SIDEBAR.has(viewId)) {
    body.append(SettingsNav());
  } else if (!VIEWS_SOLO.has(viewId)) {
    body.append(Sidebar());
  }

  const builder = VIEW_BUILDERS[viewId] || ChatPane;
  body.append(builder());

  if (VIEWS_WITH_RAIL.has(viewId)) body.append(ActivityRail());
  win.append(body);

  if (state.showProjectSwitcher) win.append(ProjectSwitcherOverlay());
  if (state.bugDrawer) win.append(BugDrawerOverlay());
  if (state.toast) win.append(h('div', { class: 'toast' }, state.toast));

  return win;
}

function ProjectSwitcherOverlay() {
  const projects = state.projects || [{ id: 'mygrant-glass', name: 'mygrant-glass' }];
  return h('div', { class: 'modal-scrim', onClick: () => { state.showProjectSwitcher = false; renderApp(); } },
    h('div', { class: 'project-switcher', onClick: e => e.stopPropagation() },
      h('div', { class: 'phead' }, 'Switch project'),
      ...projects.map(p =>
        h('div', { class: 'palette-row' + (p.id === state.project ? ' active' : ''),
                   onClick: () => pickProject(p.id) },
          h('span', { class: 'slash' }, '◆'),
          h('div', { class: 'text' },
            h('span', { class: 'skill' }, p.id),
            h('span', { class: 'desc' }, p.path || ''),
          ),
        ),
      ),
      h('div', { class: 'palette-row',
                 onClick: () => { state.showProjectSwitcher = false; m.openDataFolder(); } },
        h('span', { class: 'slash' }, '+'),
        h('div', { class: 'text' },
          h('span', { class: 'skill' }, 'Open data folder…'),
          h('span', { class: 'desc' }, 'Reveal projects in Finder'),
        ),
      ),
    ),
  );
}

function renderApp() {
  const root = $('#root');
  // Capture state that the unconditional re-render would otherwise wipe.
  const ta = document.querySelector('.chat-input textarea');
  const taFocused = ta && document.activeElement === ta;
  const caret = ta ? { start: ta.selectionStart, end: ta.selectionEnd } : null;
  // Capture chat scroll: snap to bottom only if the user was already near the bottom.
  const prevCs = $('#chat-scroll');
  const wasNearBottom = prevCs ? (prevCs.scrollHeight - prevCs.clientHeight - prevCs.scrollTop) < 80 : true;

  root.innerHTML = '';
  document.body.className = 'theme-' + state.theme;
  root.append(App());

  // Restore chat scroll
  const cs = $('#chat-scroll');
  if (cs && wasNearBottom) cs.scrollTop = cs.scrollHeight;

  // Restore textarea focus + caret if the user was typing
  if (taFocused) {
    const next = document.querySelector('.chat-input textarea');
    if (next) {
      next.focus();
      if (caret) { try { next.setSelectionRange(caret.start, caret.end); } catch {} }
    }
  }
}

// Lighter alternative: same as renderApp but explicitly preserves focus & caret. Same impl
// since renderApp now does both; kept as a separate name to make call sites' intent clearer.
function renderAppKeepFocus() { renderApp(); }

// ============================================================
// Markdownish renderer (subset, safe-ish)
// ============================================================
function renderMarkdownish(s) {
  if (!s) return '';
  // Stash mermaid + generic code fences before escaping so they don't get HTML-mangled
  const fences = [];
  let raw = String(s).replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, body) => {
    const idx = fences.push({ lang: (lang || '').toLowerCase(), body }) - 1;
    return ' FENCE' + idx + ' ';
  });
  let out = raw
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\n\n+/g, '</p><p>');
  out = '<p>' + out.replace(/\n/g, '<br>') + '</p>';
  // Restore fences as proper code blocks; mermaid fences get a sentinel class
  out = out.replace(/ FENCE(\d+) /g, (_m, i) => {
    const f = fences[Number(i)];
    const body = f.body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (f.lang === 'mermaid') {
      return '<div class="mermaid-source" style="display:none">' + f.body + '</div>';
    }
    return '<pre class="code-block"><code>' + body + '</code></pre>';
  });
  return out;
}

// ============================================================
// Actions
// ============================================================
function currentConv() {
  if (!state.activeConvId) return null;
  return state.conversationsById?.[state.activeConvId] || null;
}

function setToast(msg, ms = 2000) {
  state.toast = msg;
  renderApp();
  setTimeout(() => { state.toast = null; renderApp(); }, ms);
}

async function navigate(view) {
  // Old shortcut name 'kanban' from menu.js → bugs board
  if (view === 'kanban') view = 'bugs';
  state.view = view;
  state.showPalette = false;
  state.bugDrawer = null;
  // Lazy-load real data per view
  if (view === 'tests' || view === 'dashboard' || view === 'appmap') {
    const r = await m.listTests({ projectId: state.project }); state.dataTests = r.items || [];
  }
  if (view === 'bugs'  || view === 'dashboard') {
    const r = await m.listBugs({ projectId: state.project });  state.dataBugs = r.items || [];
  }
  if (view === 'runs'  || view === 'dashboard') {
    const r = await m.listRuns({ projectId: state.project });  state.dataRuns = r.items || [];
  }
  if (view === 'flows' || view === 'appmap') {
    const r = await m.listFlows({ projectId: state.project });   state.dataFlows = r.items || [];
  }
  if (view === 'appmap') {
    // Force a re-fetch + re-render on every nav so project switches refresh the SVG
    state.appMapSource = ''; state.appMapSvg = ''; state.appMapError = '';
    state.appmapZoom = 1; state.appmapPanX = 0; state.appmapPanY = 0;
  }
  if (view === 'devices') refreshDevices();
  if (view === 'doctor')  refreshProbes();
  renderApp();
}
function openProjectSwitcher() { state.showProjectSwitcher = true; renderApp(); }
async function pickProject(id) {
  state.project = id;
  state.showProjectSwitcher = false;
  // Reset all per-project caches so stale data doesn't leak
  state.dataTests = []; state.dataBugs = []; state.dataRuns = [];
  state.activeConvId = null;
  state.conversationsById = {};
  state.activeFlow = null; state.activeFlowContent = '';
  // Re-hydrate everything that's keyed by project
  const [tests, bugs, runs, flows, conversations, activity] = await Promise.all([
    m.listTests({ projectId: id }),
    m.listBugs({ projectId: id }),
    m.listRuns({ projectId: id }),
    m.listFlows({ projectId: id }),
    m.conversationList({ projectId: id }),
    m.recentActivity({ projectId: id, limit: 200 }),
  ]);
  state.dataTests = tests.items || [];
  state.dataBugs = bugs.items || [];
  state.dataRuns = runs.items || [];
  state.dataFlows = flows.items || [];
  state.conversations = conversations.conversations || [];
  // Invalidate AppMap cache so the new project's mermaid is re-fetched + re-rendered
  state.appMapSource = ''; state.appMapSvg = ''; state.appMapError = '';
  state.appmapZoom = 1; state.appmapPanX = 0; state.appmapPanY = 0;
  const dedup = new Map();
  for (const e of (activity?.entries || [])) if (e && e.callId) dedup.set(e.callId, e);
  state.activityEntries = Array.from(dedup.values());
  setToast('Switched to ' + id);
  renderApp();
}
async function triggerSync() {
  state.sync.status = 'pulling';
  renderApp();
  await new Promise(r => setTimeout(r, 700));
  state.sync.status = 'synced';
  renderApp();
}
function triggerAttach() { m.pickFile({ filters: [{ name: 'Any', extensions: ['*'] }] }); }

function newConversation() {
  state.activeConvId = null;
  state.conversationsById = state.conversationsById || {};
  state.view = 'chat';
  renderApp();
}

async function openConversation(id) {
  state.activeConvId = id;
  state.view = 'chat';
  const { messages } = await m.conversationOpen({ projectId: state.project, id });
  // Stitch tool calls and assistant text into a single replay
  const reconstructed = stitchMessages(messages);
  state.conversationsById = state.conversationsById || {};
  state.conversationsById[id] = { id, title: state.conversations.find(c => c.id === id)?.title || id, messages: reconstructed };
  renderApp();
}

function stitchMessages(lines) {
  const out = [];
  for (const line of lines) {
    if (line.role === 'user') out.push({ role: 'user', text: line.text });
    else if (line.role === 'assistant') out.push({ role: 'assistant', text: line.text || '', tools: line.tools || [] });
    else if (line.role === 'system' && (line.kind === 'halted' || line.kind === 'budget-exceeded')) {
      out.push({ role: 'system', kind: line.kind });
    }
  }
  return out;
}

async function sendMessage(text) {
  // Track last skill (a /-prefixed message) so the chip in chat-input is dynamic
  if (text.startsWith('/')) {
    const skill = text.split(/\s/)[0];
    state.lastSkill = skill;
  }
  // Ensure we have an active conversation locally
  if (!state.activeConvId) state.activeConvId = 'conv-' + Date.now();
  const conv = state.conversationsById?.[state.activeConvId] || { id: state.activeConvId, title: text.slice(0, 60), messages: [] };
  conv.messages.push({ role: 'user', text });
  conv.streamingText = '';
  conv.streamingTools = [];
  state.conversationsById = { ...(state.conversationsById || {}), [state.activeConvId]: conv };
  state.isStreaming = true;
  state.showPalette = false;
  renderApp();
  await m.agentSend({ conversationId: state.activeConvId, text, projectId: state.project });
  refreshConversations();
}

async function quickSend(text) {
  // Always switch to chat first so the user sees the response stream
  if (state.view !== 'chat') {
    state.view = 'chat';
    renderApp();
  }
  await sendMessage(text);
}

async function refreshConversations() {
  const r = await m.conversationList({ projectId: state.project });
  state.conversations = r.conversations || [];
  renderApp();
}

async function refreshDevices() {
  const r = await m.toolCall({ tool: 'listDevices', args: {}, projectId: state.project });
  state.devices = r.result?.devices || [];
  renderApp();
}

async function captureScreenshot(deviceId) {
  setToast('Capturing screenshot…');
  const r = await m.toolCall({ tool: 'captureScreenshot', args: { deviceId }, projectId: state.project });
  if (r?.result?.ok && r.result.path) {
    setToast('Saved: ' + r.result.path.split('/').pop());
  } else {
    setToast('Screenshot failed' + (r?.result?.mocked ? ' (mock device)' : ''));
  }
}

async function refreshProbes() {
  const r = await m.toolCall({ tool: 'checkEnvironment', args: {}, projectId: state.project });
  state.probes = r.result?.probes || [];
  renderApp();
}
async function runOneProbe(id) {
  const r = await m.toolCall({ tool: 'runProbe', args: { id }, projectId: state.project });
  const probe = r.result || { id, ok: false };
  state.probes = state.probes.map(p => p.id === id ? probe : p);
  renderApp();
}
function openInstallHelp(id) {
  const urls = {
    xcrun:    'https://developer.apple.com/download/all/?q=command%20line%20tools',
    adb:      'https://developer.android.com/tools/releases/platform-tools',
    jdk:      'https://adoptium.net/temurin/releases/',
    maestro:  'https://docs.maestro.dev/getting-started/installing-maestro',
    'anthropic-key': 'https://console.anthropic.com',
    'github-pat':    'https://github.com/settings/tokens',
  };
  m.openExternal(urls[id] || 'https://docs.maestro.dev/llms.txt');
}

async function refreshPermissions() {
  const r = await m.listPermissions();
  state.permissions = r;
  renderApp();
}
async function setPermMode(mode) {
  await m.setPermissionMode({ mode });
  refreshPermissions();
}
async function removePermRule(index) {
  await m.removePermissionRule({ index });
  refreshPermissions();
}

async function resolvePrompt(promptId, choice, tool, args) {
  await m.resolvePermission({ promptId, choice, tool, args });
  // Remove the inline card from conversation
  const conv = currentConv();
  if (conv) {
    conv.messages = conv.messages.filter(msg => msg.promptId !== promptId);
  }
  // Drop from queue
  state.pendingPrompts = state.pendingPrompts.filter(p => p.promptId !== promptId);
  renderApp();
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('morbius:theme', state.theme); } catch {}
  // Force mermaid re-init with the new theme; re-render the AppMap if it was loaded
  state.appMapMermaidInit = false;
  if (state.appMapSource) {
    state.appMapSvg = '';
    loadAppMap();
  } else {
    renderApp();
  }
}

// ============================================================
// Event wiring
// ============================================================
m.on('agent:stream', (payload) => {
  const conv = state.conversationsById?.[payload.conversationId];
  if (!conv) return;
  if (payload.kind === 'system') {
    conv.messages.push({ role: 'system', kind: 'halted' });
    conv.streamingText = undefined;
    conv.streamingTools = [];
    state.isStreaming = false;
  } else if (payload.done) {
    const finishedTools = conv.streamingTools || [];
    const failed = finishedTools.filter(t => t.status === 'fail').length;
    const passed = finishedTools.filter(t => t.status === 'pass').length;
    if (conv.streamingText !== undefined) {
      conv.messages.push({ role: 'assistant', text: conv.streamingText, tools: finishedTools });
    }
    conv.streamingText = undefined;
    conv.streamingTools = [];
    state.isStreaming = false;
    state.loopProgress = null; // clear the budget bar when the loop ends
    // Native notification when loop finishes — but only if user isn't focused on the app
    if (document.hidden && finishedTools.length > 0) {
      m.notify({
        title: 'Morbius — turn complete',
        body: passed + ' pass · ' + failed + ' fail',
      });
    }
  } else {
    conv.streamingText = (conv.streamingText || '') + (payload.delta || '');
  }
  renderApp();
});

m.on('agent:tool_call', (payload) => {
  const conv = state.conversationsById?.[payload.conversationId];
  if (!conv) return;
  conv.streamingTools = conv.streamingTools || [];
  conv.streamingTools.push({ callId: payload.callId, toolName: payload.toolName, args: payload.args, status: 'running' });
  renderApp();
});

m.on('agent:tool_result', (payload) => {
  // Find the tool card in any streaming or finalized assistant message
  for (const conv of Object.values(state.conversationsById || {})) {
    const search = (arr) => {
      if (!arr) return false;
      for (const tc of arr) {
        if (tc.callId === payload.callId) {
          tc.status = payload.status;
          tc.dur = payload.durationMs ? (payload.durationMs / 1000).toFixed(1) + 's' : '';
          return true;
        }
      }
      return false;
    };
    if (search(conv.streamingTools)) { renderApp(); return; }
    for (const msg of conv.messages) if (msg.role === 'assistant' && search(msg.tools)) { renderApp(); return; }
  }
});

m.on('activity:append', (entry) => {
  // Dedupe by callId — keep the latest status, drop transitional "running" once terminal arrives.
  const idx = state.activityEntries.findIndex(e => e.callId === entry.callId);
  if (idx >= 0) state.activityEntries[idx] = entry;
  else state.activityEntries.push(entry);
  if (state.activityEntries.length > 500) state.activityEntries = state.activityEntries.slice(-500);
  renderApp();
});

m.on('loop:budget', ({ used, budget, skill }) => {
  state.loopProgress = { used, budget, skill, meta: used.calls + ' tool calls so far' };
  renderApp();
});

m.on('loop:budget-warn', ({ level, pct }) => {
  setToast(`Budget ${pct}% used (${level === 'danger' ? 'imminent halt' : 'warning'})`, level === 'danger' ? 4000 : 2500);
});

// E-006 updater status
m.on('updater:status', ({ state: s, version, error }) => {
  if (s === 'available')    setToast('Morbius ' + version + ' available — downloading…', 3000);
  else if (s === 'downloaded') {
    state.updateReady = version;
    setToast('Update ' + version + ' downloaded — restart to install', 5000);
    renderApp();
  }
  else if (s === 'error')   setToast('Update check failed: ' + (error || ''), 4000);
  else if (s === 'current') { /* silent */ }
});

m.on('permission:prompt', (payload) => {
  state.pendingPrompts.push(payload);
  const conv = currentConv();
  if (conv) {
    conv.messages.push({ role: 'perm', ...payload });
  }
  renderApp();
});

// Menu-driven navigation
m.on('nav:view',           ({ view }) => navigate(view));
m.on('nav:new-conversation', () => newConversation());
m.on('nav:open-workspace',   () => m.openDataFolder());
m.on('nav:switch-project',   () => openProjectSwitcher());
m.on('nav:sync-now',         () => triggerSync());
m.on('nav:import-xlsx',      () => m.pickFile({ filters: [{ name: 'Excel', extensions: ['xlsx'] }] }));
m.on('nav:pmagent-transfer', () => setToast('PMAgent transfer (local stub)'));
m.on('nav:toggle-theme',     () => toggleTheme());
m.on('nav:first-launch',     () => navigate('doctor'));
m.on('nav:check-update',     () => setToast('Already up to date.'));
m.on('agent:kill', async () => {
  await m.killAgent();
  setToast('Agent halted.');
});
m.on('os:openDataFolder', () => m.openDataFolder());
m.on('run:active', () => setToast('Run active flow (no flow selected)'));
m.on('run:suite',  () => setToast('Running suite (mocked)'));

// Global hotkeys
window.addEventListener('keydown', async (e) => {
  // Cmd+. or Cmd+Esc → kill switch (E-015 non-negotiable per arch.md)
  if ((e.metaKey || e.ctrlKey) && (e.key === '.' || e.key === 'Escape')) {
    await m.killAgent();
    setToast('Halted by user.');
    e.preventDefault();
    return;
  }
  // Cmd+P → project switcher
  if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'p') {
    openProjectSwitcher();
    e.preventDefault();
    return;
  }
  // Cmd+K → focus chat textarea, open palette, prefill with `/`
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    if (state.view !== 'chat') { state.view = 'chat'; }
    state.showPalette = true;
    state.paletteFilter = '/';
    state.paletteIdx = 0;
    renderApp();
    // After re-render, set the textarea value to `/` so the user can keep typing
    setTimeout(() => {
      const ta = document.querySelector('.chat-input textarea');
      if (ta) { ta.value = '/'; ta.focus(); }
    }, 60);
    e.preventDefault();
    return;
  }
  // Esc: close palette > close project switcher > return to chat from secondary
  if (e.key === 'Escape') {
    if (state.showPalette) { state.showPalette = false; renderApp(); e.preventDefault(); return; }
    if (state.showProjectSwitcher) { state.showProjectSwitcher = false; renderApp(); e.preventDefault(); return; }
    if (state.view !== 'chat') { state.view = 'chat'; renderApp(); e.preventDefault(); return; }
  }
  // ↑ in empty chat input → recall last user message
  if (e.key === 'ArrowUp' && document.activeElement?.tagName === 'TEXTAREA' && !document.activeElement.value) {
    const conv = currentConv();
    const last = (conv?.messages || []).filter(m => m.role === 'user').pop();
    if (last) {
      document.activeElement.value = last.text;
      autoSizeTextarea(document.activeElement);
      e.preventDefault();
    }
  }
});

// Drag-and-drop: xlsx → import, yaml → flows, png/jpg → bug attach
window.addEventListener('dragover', e => { e.preventDefault(); });
window.addEventListener('drop', async (e) => {
  e.preventDefault();
  const files = Array.from(e.dataTransfer?.files || []);
  for (const f of files) {
    const ext = f.name.toLowerCase().split('.').pop();
    if (ext === 'xlsx')             setToast('Imported (stub) ' + f.name);
    else if (ext === 'yaml' || ext === 'yml') setToast('Added to flows/ (stub) ' + f.name);
    else if (['png', 'jpg', 'jpeg'].includes(ext)) setToast('Attached to active bug (stub) ' + f.name);
    else                             setToast('Unsupported drop: ' + f.name);
  }
});

// ============================================================
// Boot
// ============================================================
m.on('app:ready', async ({ home } = {}) => {
  if (home) state.home = home;
  // Find out if the real SDK is wired
  try { const r = await m.agentMode(); state.agentMode = r?.mode || 'mock'; } catch { state.agentMode = 'mock'; }
  const [skills, devices, probes, conversations, permissions, projects, activity] = await Promise.all([
    m.skillList(),
    m.toolCall({ tool: 'listDevices', args: {}, projectId: state.project }),
    m.toolCall({ tool: 'checkEnvironment', args: {}, projectId: state.project }),
    m.conversationList({ projectId: state.project }),
    m.listPermissions(),
    m.listProjects(),
    m.recentActivity({ projectId: state.project, limit: 200 }),
  ]);
  // Hydrate activity rail with deduped recent entries (last-status-wins per callId)
  const dedup = new Map();
  for (const e of (activity?.entries || [])) {
    if (e && e.callId) dedup.set(e.callId, e);
  }
  state.activityEntries = Array.from(dedup.values());
  state.skills = skills.skills || [];
  state.devices = devices.result?.devices || [];
  state.probes = probes.result?.probes || [];
  state.conversations = conversations.conversations || [];
  state.permissions = permissions;
  state.projects = projects.projects || [];
  state.repoRoot = projects.root || '';
  if (state.projects.length > 0 && !state.projects.find(p => p.id === state.project)) {
    state.project = state.projects[0].id;
  }
  // First-launch: show onboarding unless already done
  if (!localStorage.getItem('morbius:onboarded')) {
    state.showOnboarding = true;
    state.onboardingStep = 0;
  }
  renderApp();
});

// Initial paint
state.conversationsById = {};
renderApp();
