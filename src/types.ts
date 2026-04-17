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

// Run record written to disk after each test run
export interface MaestroRunRecord {
  runId: string;
  testId: string;
  platform: 'android' | 'ios' | 'unknown';
  status: 'pass' | 'fail' | 'error';
  startTime: string;          // ISO
  endTime: string;            // ISO
  durationMs: number;
  exitCode: number;
  failingStep: string | null; // exact YAML step text that failed
  errorLine: string | null;   // error message line from stdout
  screenshotPath: string | null; // relative path: screenshots/{runId}/{testId}.png
}

// Pointer file {testId}-latest.json — used by Kanban thumbnail
export interface LatestRunPointer {
  runId: string;
  screenshotPath: string | null;
  status: 'pass' | 'fail' | 'error';
  failingStep: string | null;
  errorLine: string | null;
  timestamp: string;
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
}

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
