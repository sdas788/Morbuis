// E-009/10 — JSON schemas for the 19 tools exposed to the Anthropic SDK.
// The schemas mirror the implementations in tools.js. The agent picks tools by name;
// arguments are validated by the SDK before invokeTool() executes them.

const TOOL_SCHEMAS = [
  {
    name: 'listDevices',
    description: 'List booted iOS simulators and Android emulators on the host Mac. Returns an array of { platform, name, udid, os, state }.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'runMaestroFlow',
    description: 'Run a Maestro flow YAML against a specific device. Returns { ok, output, duration }.',
    input_schema: {
      type: 'object',
      properties: {
        flowPath: { type: 'string', description: 'Path to the .yaml flow file' },
        deviceId: { type: 'string', description: 'UDID of the simulator/emulator from listDevices' },
      },
      required: ['flowPath'],
    },
  },
  {
    name: 'captureScreenshot',
    description: 'Capture a PNG screenshot of a booted iOS simulator. Returns { ok, path }.',
    input_schema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', description: 'UDID of the simulator (or "booted")' },
        outPath:  { type: 'string', description: 'Optional output path; defaults to app data/screenshots/' },
      },
    },
  },
  {
    name: 'tailLog',
    description: 'Tail recent system log entries on the host Mac. Returns { lines } as a multi-line string.',
    input_schema: {
      type: 'object',
      properties: {
        device: { type: 'string', description: 'Reserved' },
        lines:  { type: 'integer', description: 'Number of lines (default 40)' },
      },
    },
  },
  {
    name: 'runShellCommand',
    description: 'Run an arbitrary shell command via /bin/sh -c. ALWAYS requires user permission. Use sparingly. Returns { ok, code, stdout, stderr }.',
    input_schema: {
      type: 'object',
      properties: { cmd: { type: 'string', description: 'Shell command line' } },
      required: ['cmd'],
    },
  },
  {
    name: 'readFile',
    description: 'Read a file from disk. Returns { ok, contents }.',
    input_schema: {
      type: 'object',
      properties: { filePath: { type: 'string' } },
      required: ['filePath'],
    },
  },
  {
    name: 'writeFile',
    description: 'Write a file to disk. Requires permission. Creates parent dirs as needed. Returns { ok }.',
    input_schema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        contents: { type: 'string' },
      },
      required: ['filePath', 'contents'],
    },
  },
  {
    name: 'editFile',
    description: 'Replace all occurrences of `search` with `replace` in a file. Requires permission. Returns { ok, changed }.',
    input_schema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        search:   { type: 'string' },
        replace:  { type: 'string' },
      },
      required: ['filePath', 'search', 'replace'],
    },
  },
  {
    name: 'commitToGithub',
    description: 'Commit and push a set of files to the workspace GitHub repo. Requires permission. Currently mocked locally; returns { ok, sha, mocked: true }.',
    input_schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        files:   { type: 'array', items: { type: 'string' } },
      },
      required: ['message'],
    },
  },
  {
    name: 'pullFromGithub',
    description: 'Pull the latest from the workspace GitHub repo. Mocked locally for now.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'readTestCase',
    description: 'List or read test cases for the active project. Returns { ok, tests, matched }.',
    input_schema: {
      type: 'object',
      properties: {
        id:  { type: 'string' },
        tag: { type: 'string', description: 'Filter tag like "@smoke"' },
      },
    },
  },
  {
    name: 'writeTestCase',
    description: 'Write a test case markdown to data/<project>/tests/<id>.md. Requires permission.',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'string' }, contents: { type: 'string' } },
      required: ['id', 'contents'],
    },
  },
  {
    name: 'uploadScreenshot',
    description: 'Upload a screenshot to cloud storage. Currently mocked.',
    input_schema: {
      type: 'object',
      properties: { filePath: { type: 'string' } },
      required: ['filePath'],
    },
  },
  {
    name: 'runProbe',
    description: 'Run a single environment probe by id. Valid ids: xcrun, adb, jdk, maestro, node, anthropic-key, github-pat. Returns { id, ok, detail }.',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'checkEnvironment',
    description: 'Run all environment probes. Returns { probes: [...] }.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'readPMAgentSpec',
    description: 'Read a PMAgent epic/spec from the sibling PMAgent directory. Returns { ok, exists, root, epicId }.',
    input_schema: {
      type: 'object',
      properties: { epicId: { type: 'string' } },
    },
  },
  {
    name: 'pullFromPMAgent',
    description: 'Pull latest specs from PMAgent. Mocked locally for now.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'publishToPMAgent',
    description: 'Publish a QA result back to PMAgent. Requires permission. Mocked locally for now.',
    input_schema: {
      type: 'object',
      properties: {
        target: { type: 'string' },
        items:  { type: 'array' },
      },
    },
  },
  {
    name: 'classify',
    description: 'Classify a failed run\'s output into a severity (P0/P1/P2/P3) and hypothesis. Returns { ok, runId, severity, hypothesis }.',
    input_schema: {
      type: 'object',
      properties: {
        runId:  { type: 'string' },
        output: { type: 'string' },
      },
    },
  },
  {
    name: 'fileBug',
    description: 'File a new bug ticket. Requires permission. Returns { ok, id, title, severity }.',
    input_schema: {
      type: 'object',
      properties: {
        title:    { type: 'string' },
        severity: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
      },
      required: ['title'],
    },
  },
];

function getToolSchemas() {
  // Built-ins + whatever MCP servers have published this session
  let mcpTools = [];
  try {
    const mcp = require('./mcp');
    mcpTools = mcp.listMcpToolSchemas() || [];
  } catch {}
  return TOOL_SCHEMAS.concat(mcpTools);
}

function getSystemPrefix({ projectId, project }) {
  return [
    'You are Morbius — an embedded QA agent that drives Maestro tests on the user\'s Mac.',
    '',
    'You have access to a set of typed tools to:',
    '  • inspect devices and run Maestro flows on them',
    '  • read/write files and edit flows',
    '  • classify failures and file bugs',
    '  • commit results to GitHub and publish to PMAgent (currently mocked)',
    '',
    'Active project: ' + (projectId || 'unknown') + (project ? ' (' + project + ')' : ''),
    '',
    'Guidelines:',
    '  1. Be concise. Stream short status lines as you work, then summarize at the end.',
    '  2. Prefer reading state (listDevices, checkEnvironment, readTestCase) before mutating it.',
    '  3. Shell commands and file writes ALWAYS prompt the user for permission. Explain WHY before each.',
    '  4. If the user halts with ⌘., stop immediately and confirm.',
    '  5. When a slash-command skill is active (e.g. /smoke), follow its instructions in the system prompt below.',
  ].join('\n');
}

module.exports = { getToolSchemas, getSystemPrefix };
