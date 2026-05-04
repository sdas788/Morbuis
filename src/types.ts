// ============================================================
// Morbius — Type Definitions
// ============================================================

// --- Test Case ---

export interface TestCase {
  id: string;                    // e.g., "TC-1.01"
  title: string;                 // e.g., "Create Account - Happy Path"
  category: string;              // slug, e.g., "create-account"
  scenario: string;              // "Happy Path" | "Edge Case" | "Detour" | "Flow"
  status: TestStatus;
  priority: Priority;
  steps: string;                 // markdown body — human-readable steps from Excel
  acceptanceCriteria: string;    // markdown body — from Excel column D
  notes: string;                 // from Excel column G
  maestroFlow?: string;          // absolute path to linked Maestro YAML
  platforms: string[];           // ["android", "ios"]
  tags: string[];
  deviceResults: DeviceResult[];
  history: RunResult[];
  created: string;               // ISO date
  maestroFlowAndroid?: string;    // absolute path to Android Maestro YAML
  maestroFlowIos?: string;        // absolute path to iOS Maestro YAML
  order?: number;                 // manual sort order within category
  changelog?: ChangelogEntry[];   // change history
  updated: string;               // ISO date
  // E-023 / S-023-001: backreference to source PMAgent story+AC when this test case
  // was transferred from a PMAgent project. Stamped by the transfer pipeline; absent
  // for tests imported via Excel or created manually. Drives the results-readback
  // endpoint (S-023-004) and the drift detector (S-023-005).
  pmagentSource?: PMAgentSource;
  // E-023 / C4 mitigation: when true, the drift detector + manual re-transfer skip
  // overwriting this test case body even if the source AC checksum changed.
  pmagentLocked?: boolean;
}

export interface PMAgentSource {
  slug: string;          // PMAgent project slug, e.g. "morbius"
  storyId: string;       // e.g. "S-013-001"
  acIndex: number;       // 0-based AC index within the story (or test plan row index)
  sourcePath: string;    // absolute path to the source story or T-NNN-NNN-*.md file
  sourceChecksum: string; // SHA-256 of normalized AC/test-plan-row text
}

export type TestStatus = 'pass' | 'fail' | 'flaky' | 'not-run' | 'in-progress';
export type Priority = 'P1' | 'P2' | 'P3' | 'P4';

// --- Changelog ---

export interface ChangelogEntry {
  timestamp: string;              // ISO datetime
  field: string;                  // 'status' | 'priority' | 'notes' | 'order'
  oldValue: string;
  newValue: string;
  actor: string;                  // 'dashboard' | 'cli' | 'agent' | 'excel-import' | 'maestro-run'
}

// --- Bug ---

export interface Bug {
  id: string;                    // e.g., "BUG-042" or "STS-42" (Jira key)
  title: string;
  status: BugStatus;
  priority: Priority;
  category: string;              // slug
  linkedTest: string;            // test case ID
  device: string;                // device slug
  run?: string;                  // run ID
  failureReason: string;         // error message from Maestro
  stepsToReproduce: string;      // markdown
  selectorAnalysis: SelectorWarning[];
  notes: string;                 // editable markdown
  screenshot?: string;           // relative path to full screenshot
  thumbnail?: string;            // relative path to thumbnail
  created: string;
  updated: string;
  changelog?: ChangelogEntry[];   // change history
  // Jira integration
  source?: 'local' | 'jira';    // where this bug came from
  jiraKey?: string;              // e.g., "STS-42"
  jiraUrl?: string;              // link to Jira issue
  assignee?: string;             // Jira assignee display name
  jiraStatus?: string;         // e.g., "In Progress"
  jiraAssignee?: string;       // display name from Jira
  jiraPriority?: string;       // "High", "Medium", etc.
  jiraLastComment?: string;    // body of most recent comment
  jiraLastSynced?: string;     // ISO timestamp of last sync
}

export type BugStatus = 'open' | 'investigating' | 'fixed' | 'closed';

// --- Self-Healing Selectors (E-017) ---
// Persisted at data/{projectId}/healing/proposal-{id}.md
// State machine:
//   requested → snapshotting → proposed → validating → validated | invalidated | error
//   validated → approved → applied (or rejected at any point)

export type HealingState =
  | 'requested'      // failure detected, classifier said "selector miss"
  | 'snapshotting'   // capturing view hierarchy
  | 'proposed'       // Claude returned a candidate
  | 'validating'     // re-running flow with the proposal
  | 'validated'      // re-run passed → ready for review
  | 'invalidated'    // re-run failed → hidden by default
  | 'error'          // pipeline crashed (stored for debugging)
  | 'approved'       // human approved, awaiting YAML write
  | 'applied'        // YAML updated, proposal closed
  | 'rejected';      // human rejected

export interface HealingProposal {
  id: string;
  runId: string;
  testId: string;
  flowPath: string;             // absolute path to YAML
  platform: 'android' | 'ios' | string;
  failedSelector: string;
  failureLine?: number;
  errorLine?: string;
  state: HealingState;
  proposedSelector?: string;
  modifiedSelector?: string;    // human-edited override (S-017-005 "Modify")
  confidence?: number;          // 0..1
  rationale?: string;
  hierarchySnapshotPath?: string;  // sibling .txt
  validationRunId?: string;     // run that validated/invalidated the proposal
  createdAt: string;
  updatedAt: string;
  appliedAt?: string;
  errorReason?: string;         // when state==='error'
  rawClaudeResponse?: string;   // when parse failed
}

// --- Bug Impact (E-016) ---
// Persisted at data/{projectId}/bugs/{bugId}/impact.md (overwrites on regeneration).

export interface BugImpactRelatedTest {
  testId: string;
  rationale: string;
}

export interface BugImpact {
  bugId: string;
  generatedAt: string;          // ISO timestamp
  bugStatus: BugStatus;
  riskScore: number;            // 0.0–1.0
  rerun: BugImpactRelatedTest[];        // tests to re-run after the fix lands
  manualVerify: BugImpactRelatedTest[]; // tests that need human verification (can't be auto-rerun)
  reproNarrative: string;       // markdown — paste-able into a tester's task list
  generatedBy?: 'claude' | 'manual';
  modelDurationMs?: number;     // observability — how long the agent took
}

// --- AppMap Narrative (E-027) ---
// Persisted at data/{projectId}/appmap-narrative.md (overwrites on regeneration).
// Mirrors the BugImpact pattern: frontmatter + body, single file per project.

export interface AppMapPerFlow {
  flowId: string;            // matches MaestroFlow.id (filename without .yaml)
  whyPicked: string;         // 1–2 sentences explaining why this specific flow was automated
  lastRunsSummary: string;   // Claude's read of recent run history; "No runs yet" when empty
  agentTimeMs: number;       // sum of recent runs durationMs + proportional slice of generation time
}

export interface AppMapNarrative {
  projectId: string;
  generatedAt: string;          // ISO timestamp
  generatedBy?: 'claude' | 'manual';
  modelDurationMs?: number;     // duration of the Claude call that produced this narrative
  flowsCovered: number;
  testCasesTotal: number;
  coveragePct: number;          // (flowsCovered / testCasesTotal) * 100, one decimal
  qualityFlag?: 'generic';      // set if lint detected boilerplate after retry
  whyTheseFlows: string;        // markdown prose, project-level rationale
  whatTheAgentLearned: string;  // markdown prose, observations the agent surfaced
  timeOnTask: {
    generationMs: number;       // cumulative from agent-activity.json (kind=appmap-narrative)
    runMs: number;              // cumulative from runs/*.yaml durationMs
    totalMs: number;            // generationMs + runMs
  };
  perFlow: AppMapPerFlow[];
}

// --- Device ---

export interface Device {
  id: string;                    // slug, e.g., "ipad"
  name: string;                  // display name, e.g., "iPad"
  platform: 'ios' | 'android';
  excelColumn?: string;          // column letter in Excel, e.g., "I"
}

export interface DeviceResult {
  device: string;                // device slug
  status: TestStatus;
  run?: string;                  // run ID
  timestamp?: string;            // ISO date
}

// --- Category ---

export interface Category {
  id: string;                    // slug
  name: string;                  // display name
  sheet?: string;                // Excel sheet name (for sync)
  order: number;
  testCount?: number;
  passCount?: number;
}

// --- Run ---

export interface TestRun {
  id: string;                    // e.g., "run-034"
  timestamp: string;
  devices: string[];             // device slugs
  results: RunResult[];
  summary: RunSummary;
}

export interface RunResult {
  test: string;                  // test case ID
  device?: string;
  status: TestStatus;
  durationMs?: number;
  bugCreated?: string;           // bug ID
  failureReason?: string;
  screenshot?: string;
}

export interface RunSummary {
  total: number;
  passed: number;
  failed: number;
  flaky: number;
  notRun: number;
}

// E-024 / S-024-002: generic RunRecord shape — handles both Maestro (mobile) and
// browser-MCP (web) runs. Maestro-specific fields are optional; web-specific fields
// are optional. The `runner` discriminator tells consumers how to render.
export interface RunRecord {
  runId: string;
  testId: string;
  runner: 'maestro' | 'web-headless' | 'web-visual' | 'manual';
  target: 'android' | 'ios' | 'web' | 'unknown';
  status: 'pass' | 'fail' | 'error';
  startTime: string;
  endTime?: string;
  durationMs: number;
  // Maestro-specific (optional)
  exitCode?: number;
  failingStep?: string | null;
  // Shared
  errorLine?: string | null;
  screenshotPath?: string | null;   // legacy single-screenshot pointer (Maestro)
  screenshots?: string[];           // E-024: multi-screenshot list (web runs emit several)
  // Web-specific
  targetUrl?: string;
  domSnapshot?: string;
  // Friendly failure classification (added 2026-04-30 for better error UX)
  failureCategory?: string;     // e.g. 'driver-not-running', 'element-not-found'
  friendlyError?: string;       // short label shown in UI: "Maestro driver not connected to the device"
  hint?: string;                // remediation suggestion
  debugFolder?: string;         // Maestro's own debug folder path (logs + step-by-step screenshots)
  // Configured device slug the run targeted (e.g. 'iphone', 'android-phone'). Undefined
  // for legacy runs (pre-2026-04-30), web runs, manual runs, or when no booted device
  // matched the active project's `ProjectConfig.devices`.
  device?: string;
}

// Backwards-compat alias — `MaestroRunRecord` is the legacy name, kept so older
// callers compile. Equivalent to `RunRecord`.
export type MaestroRunRecord = RunRecord & {
  // Old code assumed these were always set; widen here to keep compile passing
  platform?: 'android' | 'ios' | 'unknown';
};

// Pointer file {testId}-latest.json — used by Kanban thumbnail
export interface LatestRunPointer {
  runId: string;
  screenshotPath: string | null;
  status: 'pass' | 'fail' | 'error';
  failingStep: string | null;
  errorLine: string | null;
  timestamp: string;
  failureCategory?: string;
  friendlyError?: string;
  hint?: string;
  device?: string;
}

// Repair run tracking
export interface RepairRun {
  repairId: string;
  testId: string;
  platform: string;
  status: 'running' | 'pass' | 'fail' | 'escalated';
  attempt: number;
  maxRetries: number;
  diagnosis: string;
  diff: string;
  startedAt: string;
}

// Suite run tracking
export interface SuiteRun {
  suiteId: string;
  projectId: string;
  platform: string;
  status: 'running' | 'complete' | 'error';
  current: number;
  total: number;
  results: Array<{ testId: string; status: string; durationMs: number }>;
  startedAt: string;
  endedAt?: string;
}

// --- Selector Analysis ---

export interface SelectorWarning {
  line: number;
  command: string;
  issue: string;
}

// --- Maestro Flow ---

export interface MaestroFlow {
  appId: string;
  name: string;
  qaPlanId: string | null;
  tags: string[];
  envVars: Record<string, string>;
  steps: MaestroStep[];
  referencedFlows: string[];
  selectorWarnings: SelectorWarning[];
}

export interface MaestroStep {
  action: string;                // e.g., "tapOn", "assertVisible"
  humanReadable: string;         // e.g., "Tap on 'Sign In'"
  target?: string;
  children?: MaestroStep[];
  condition?: string;
  lineNumber?: number;
}

// --- Config ---

export interface MorbiusConfig {
  project: {
    name: string;
  };
  excel?: {
    source: string;
    autoWatch?: boolean;
  };
  categories: Category[];
  devices: Device[];
  maestro?: {
    androidPath?: string;
    iosPath?: string;
  };
  settings: {
    flakinessWindow: number;
    flakinessThreshold: number;
    theme: 'dark' | 'light';
  };
}

// --- Multi-Project ---

export interface ProjectConfig {
  id: string;                    // slug, e.g., "micro-air"
  name: string;                  // display name, e.g., "Micro-Air ConnectRV"
  created: string;               // ISO date
  excel?: {
    source: string;              // absolute path to .xlsx
  };
  maestro?: {
    androidPath?: string;
    iosPath?: string;
  };
  env?: Record<string, string>;  // required env vars (e.g., TEST_EMAIL, TEST_PASSWORD)
  devices: Device[];
  appId?: string;                // e.g., "com.microair.connectrv.dev"
  prerequisites?: string[];      // free-text list of things needed before using
  jira?: {
    cloudId: string;             // Atlassian cloud ID or site URL
    projectKey: string;          // e.g., "STS", "MA"
    jql?: string;                // custom JQL, defaults to "project = X AND type = Bug"
  };
  appMap?: string;               // Mermaid flowchart definition for app navigation
  codebasePath?: string;         // Absolute path to the app source repo (for coverage analysis)
  mediaPath?: string;            // Absolute path where run videos/screenshots are stored (outside Morbius repo)
  // E-023 / S-023-001: link this Morbius project to a PMAgent project. Set `pmagentSlug`
  // to enable the transfer pipeline; `pmagentPath` overrides the default
  // ${PMAGENT_HOME ?? '/Users/sdas/PMAgent'}/projects/${pmagentSlug} resolution.
  pmagentSlug?: string;
  pmagentPath?: string;
  // E-024 / S-024-001: which runner type drives this project's tests.
  // Default 'mobile' for backwards compat with all existing Maestro projects.
  // 'web' switches the TestDrawer Run button + dispatches /api/test/run-web.
  // 'api' is reserved (no v1 runner yet — falls back to manual status).
  projectType?: 'mobile' | 'web' | 'api';
  webUrl?: string;               // base URL for web-app runs, e.g. http://localhost:9000
}

export type ProjectType = 'mobile' | 'web' | 'api';

export interface ProjectRegistry {
  activeProject: string;         // project id
  projects: ProjectConfig[];
}

// --- Excel Sync ---

export interface SyncMeta {
  lastImport: string;            // ISO timestamp
  excelModified: string;         // ISO timestamp of Excel file
  checksums: Record<string, string>;  // "sheetName:rowId" → checksum
}

// --- Dashboard Data (aggregated for server responses) ---

export interface DashboardData {
  overallHealth: {
    total: number;
    passed: number;
    percentage: number;
  };
  categories: CategoryHealth[];
  flakyTests: FlakyTest[];
  deviceCoverage: DeviceCoverage[];
  recentActivity: ActivityItem[];
  coverageGaps: string[];
}

export interface CategoryHealth {
  category: Category;
  total: number;
  passed: number;
  failed: number;
  flaky: number;
  notRun: number;
  percentage: number;
}

export interface FlakyTest {
  testId: string;
  testTitle: string;
  category: string;
  score: number;                 // 0-1
  recentResults: TestStatus[];   // last N run statuses
}

export interface DeviceCoverage {
  device: Device;
  total: number;
  passed: number;
  percentage: number;
}

export interface ActivityItem {
  type: 'bug_opened' | 'test_failed' | 'test_flaky' | 'run_completed';
  title: string;
  id: string;
  timestamp: string;
}
