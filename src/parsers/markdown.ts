import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { TestCase, Bug, BugImpact, BugImpactRelatedTest, Category, TestRun, TestStatus, Priority, ChangelogEntry, HealingProposal, HealingState, AppMapNarrative, AppMapPerFlow } from '../types.js';
import { DATA_DIR as BASE_DATA_DIR } from '../data-dir.js';

export function getDataDir(projectId?: string): string {
  if (projectId) return path.join(BASE_DATA_DIR, projectId);
  return BASE_DATA_DIR;
}

// --- Read Operations ---

export function readTestCase(filePath: string): TestCase {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);

  const sections = parseSections(content);

  return {
    id: data.id ?? '',
    title: data.title ?? '',
    category: data.category ?? '',
    scenario: data.scenario ?? 'Happy Path',
    status: (data.status as TestStatus) ?? 'not-run',
    priority: (data.priority as Priority) ?? 'P3',
    steps: sections['Steps'] ?? '',
    acceptanceCriteria: sections['Expected Result'] ?? '',
    notes: sections['Notes'] ?? '',
    maestroFlow: data.maestro_flow ?? undefined,
    maestroFlowAndroid: data.maestro_flow_android ?? undefined,
    maestroFlowIos: data.maestro_flow_ios ?? undefined,
    platforms: data.platforms ?? [],
    tags: data.tags ?? [],
    deviceResults: parseDeviceResultsTable(sections['Device Results'] ?? ''),
    history: parseHistoryTable(sections['History'] ?? ''),
    order: data.order ?? 999,
    changelog: parseChangelogTable(sections['Changelog'] ?? ''),
    created: data.created ?? new Date().toISOString().split('T')[0],
    updated: data.updated ?? new Date().toISOString().split('T')[0],
    // E-023 / S-023-001: PMAgent backreference round-trip
    pmagentSource: (data.pmagent_source && typeof data.pmagent_source === 'object') ? {
      slug: String((data.pmagent_source as Record<string, unknown>).slug ?? ''),
      storyId: String((data.pmagent_source as Record<string, unknown>).story_id ?? ''),
      acIndex: Number((data.pmagent_source as Record<string, unknown>).ac_index ?? 0),
      sourcePath: String((data.pmagent_source as Record<string, unknown>).source_path ?? ''),
      sourceChecksum: String((data.pmagent_source as Record<string, unknown>).source_checksum ?? ''),
    } : undefined,
    pmagentLocked: data.pmagent_locked === true ? true : undefined,
  };
}

export function readBug(filePath: string): Bug {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);

  const sections = parseSections(content);

  return {
    id: data.id ?? '',
    title: data.title ?? '',
    status: data.status ?? 'open',
    priority: (data.priority as Priority) ?? 'P3',
    category: data.category ?? '',
    linkedTest: data.linked_test ?? '',
    device: data.device ?? '',
    run: data.run ?? undefined,
    failureReason: sections['Failure Reason'] ?? '',
    stepsToReproduce: sections['Steps to Reproduce'] ?? '',
    selectorAnalysis: parseSelectorTable(sections['Selector Analysis'] ?? ''),
    notes: sections['Notes'] ?? '',
    screenshot: data.screenshot ?? undefined,
    thumbnail: data.thumbnail ?? undefined,
    created: data.created ?? '',
    updated: data.updated ?? '',
    source: data.source ?? 'local',
    jiraKey: data.jira_key ?? undefined,
    jiraUrl: data.jira_url ?? undefined,
    assignee: data.assignee ?? undefined,
  };
}

export function readCategory(dirPath: string): Category | null {
  const catFile = path.join(dirPath, '_category.yaml');
  if (!fs.existsSync(catFile)) return null;
  const raw = fs.readFileSync(catFile, 'utf-8');
  const { data } = matter(raw);
  return {
    id: data.id ?? path.basename(dirPath),
    name: data.name ?? path.basename(dirPath),
    sheet: data.sheet ?? undefined,
    order: data.order ?? 0,
  };
}

// --- Write Operations ---

export function writeTestCase(testCase: TestCase, dir?: string): string {
  const categoryDir = dir ?? path.join(BASE_DATA_DIR, 'tests', testCase.category);
  fs.mkdirSync(categoryDir, { recursive: true });

  const slug = testCase.id.toLowerCase().replace(/\s+/g, '-');
  const titleSlug = testCase.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
  const fileName = `${slug}-${titleSlug}.md`;
  const filePath = path.join(categoryDir, fileName);

  const frontmatter: Record<string, unknown> = {
    id: testCase.id,
    title: testCase.title,
    category: testCase.category,
    scenario: testCase.scenario,
    status: testCase.status,
    priority: testCase.priority,
    platforms: testCase.platforms,
    tags: testCase.tags,
    created: testCase.created,
    updated: testCase.updated,
  };

  if (testCase.maestroFlow) {
    frontmatter.maestro_flow = testCase.maestroFlow;
  }

  // E-023 / S-023-001: serialize PMAgent backreference + lock flag when present
  if (testCase.pmagentSource) {
    frontmatter.pmagent_source = {
      slug: testCase.pmagentSource.slug,
      story_id: testCase.pmagentSource.storyId,
      ac_index: testCase.pmagentSource.acIndex,
      source_path: testCase.pmagentSource.sourcePath,
      source_checksum: testCase.pmagentSource.sourceChecksum,
    };
  }
  if (testCase.pmagentLocked) frontmatter.pmagent_locked = true;

  let body = '';

  if (testCase.steps) {
    body += `## Steps\n${testCase.steps}\n\n`;
  }

  if (testCase.acceptanceCriteria) {
    body += `## Expected Result\n${testCase.acceptanceCriteria}\n\n`;
  }

  if (testCase.deviceResults.length > 0) {
    body += `## Device Results\n`;
    body += `| Device | Status | Run | Timestamp |\n`;
    body += `|--------|--------|-----|----------|\n`;
    for (const dr of testCase.deviceResults) {
      body += `| ${dr.device} | ${dr.status} | ${dr.run ?? ''} | ${dr.timestamp ?? ''} |\n`;
    }
    body += '\n';
  }

  if (testCase.history.length > 0) {
    body += `## History\n`;
    body += `| Run | Status | Timestamp |\n`;
    body += `|-----|--------|-----------|\n`;
    for (const h of testCase.history) {
      body += `| ${h.test ?? ''} | ${h.status} | ${h.device ?? ''} |\n`;
    }
    body += '\n';
  }

  if (testCase.notes) {
    body += `## Notes\n${testCase.notes}\n`;
  }

  const content = matter.stringify(body, frontmatter);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

export function writeBug(bug: Bug, dir?: string): string {
  const bugDir = dir ?? path.join(BASE_DATA_DIR, 'bugs');
  fs.mkdirSync(bugDir, { recursive: true });

  const slug = bug.id.toLowerCase();
  const titleSlug = bug.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '').slice(0, 40);
  const fileName = `${slug}-${titleSlug}.md`;
  const filePath = path.join(bugDir, fileName);

  const frontmatter: Record<string, unknown> = {
    id: bug.id,
    title: bug.title,
    status: bug.status,
    priority: bug.priority,
    category: bug.category,
    linked_test: bug.linkedTest,
    device: bug.device,
    created: bug.created,
    updated: bug.updated,
  };

  if (bug.run) frontmatter.run = bug.run;
  if (bug.screenshot) frontmatter.screenshot = bug.screenshot;
  if (bug.thumbnail) frontmatter.thumbnail = bug.thumbnail;
  if (bug.selectorAnalysis.length > 0) frontmatter.fragile_selectors = true;
  if (bug.source) frontmatter.source = bug.source;
  if (bug.jiraKey) frontmatter.jira_key = bug.jiraKey;
  if (bug.jiraUrl) frontmatter.jira_url = bug.jiraUrl;
  if (bug.assignee) frontmatter.assignee = bug.assignee;

  let body = '';

  if (bug.failureReason) {
    body += `## Failure Reason\n${bug.failureReason}\n\n`;
  }

  if (bug.stepsToReproduce) {
    body += `## Steps to Reproduce\n${bug.stepsToReproduce}\n\n`;
  }

  if (bug.selectorAnalysis.length > 0) {
    body += `## Selector Analysis\n`;
    body += `| Line | Command | Issue |\n`;
    body += `|------|---------|-------|\n`;
    for (const s of bug.selectorAnalysis) {
      body += `| ${s.line} | \`${s.command}\` | ${s.issue} |\n`;
    }
    body += '\n';
  }

  body += `## Notes\n${bug.notes || '_Investigation notes here._'}\n`;

  const content = matter.stringify(body, frontmatter);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

export function writeCategory(category: Category, dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, '_category.yaml');
  const frontmatter = {
    id: category.id,
    name: category.name,
    sheet: category.sheet,
    order: category.order,
  };
  const content = matter.stringify('', frontmatter);
  fs.writeFileSync(filePath, content, 'utf-8');
}

// --- Update Operations (find file by ID, update frontmatter) ---

export function updateTestCaseById(
  testId: string,
  updates: Partial<{ status: string; priority: string; notes: string; order: number }>,
  dataDir?: string,
  actor: string = 'dashboard',
): boolean {
  const testsDir = path.join(dataDir ?? BASE_DATA_DIR, 'tests');
  if (!fs.existsSync(testsDir)) return false;

  // Scan all categories for the test case file
  for (const cat of fs.readdirSync(testsDir, { withFileTypes: true })) {
    if (!cat.isDirectory()) continue;
    const catDir = path.join(testsDir, cat.name);
    for (const file of fs.readdirSync(catDir).filter(f => f.endsWith('.md'))) {
      const filePath = path.join(catDir, file);
      const raw = fs.readFileSync(filePath, 'utf-8');
      const { data, content } = matter(raw);
      if (data.id !== testId) continue;

      // Build changelog entries for changed fields
      const now = new Date().toISOString();
      const changelogEntries: string[] = [];

      if (updates.status !== undefined && data.status !== updates.status) {
        changelogEntries.push(`| ${now} | status | ${data.status ?? 'not-run'} | ${updates.status} | ${actor} |`);
        data.status = updates.status;
      } else if (updates.status !== undefined) {
        data.status = updates.status;
      }

      if (updates.priority !== undefined && data.priority !== updates.priority) {
        changelogEntries.push(`| ${now} | priority | ${data.priority ?? 'P3'} | ${updates.priority} | ${actor} |`);
        data.priority = updates.priority;
      } else if (updates.priority !== undefined) {
        data.priority = updates.priority;
      }

      if (updates.order !== undefined && data.order !== updates.order) {
        changelogEntries.push(`| ${now} | order | ${data.order ?? 999} | ${updates.order} | ${actor} |`);
        data.order = updates.order;
      } else if (updates.order !== undefined) {
        data.order = updates.order;
      }

      data.updated = new Date().toISOString().split('T')[0];

      // Handle notes update in body
      let newContent = content;
      if (updates.notes !== undefined) {
        const oldNotes = extractSection(content, 'Notes');
        if (oldNotes.trim() !== updates.notes.trim()) {
          changelogEntries.push(`| ${now} | notes | (updated) | (updated) | ${actor} |`);
        }
        const sections = content.split(/^## /m);
        let found = false;
        newContent = sections.map((s, i) => {
          if (i === 0) return s;
          if (s.startsWith('Notes')) {
            found = true;
            return `Notes\n${updates.notes}\n\n`;
          }
          return s;
        }).join('## ');
        if (!found) {
          newContent = newContent.trimEnd() + `\n\n## Notes\n${updates.notes}\n`;
        }
      }

      // Append changelog entries
      if (changelogEntries.length > 0) {
        newContent = appendChangelog(newContent, changelogEntries);
      }

      fs.writeFileSync(filePath, matter.stringify(newContent, data), 'utf-8');
      return true;
    }
  }
  return false;
}

function extractSection(content: string, sectionName: string): string {
  const sections = content.split(/^## /m);
  for (const s of sections) {
    if (s.startsWith(sectionName)) {
      return s.slice(sectionName.length).trim();
    }
  }
  return '';
}

function appendChangelog(content: string, entries: string[]): string {
  const changelogHeader = '| Timestamp | Field | Old Value | New Value | Actor |';
  const changelogSep = '|-----------|-------|-----------|-----------|-------|';

  const sections = content.split(/^## /m);
  let found = false;
  const newContent = sections.map((s, i) => {
    if (i === 0) return s;
    if (s.startsWith('Changelog')) {
      found = true;
      // Append new entries to existing table
      return s.trimEnd() + '\n' + entries.join('\n') + '\n\n';
    }
    return s;
  }).join('## ');

  if (!found) {
    // Create new changelog section
    return newContent.trimEnd() + '\n\n## Changelog\n' + changelogHeader + '\n' + changelogSep + '\n' + entries.join('\n') + '\n';
  }
  return newContent;
}

export function updateBugById(
  bugId: string,
  updates: Partial<{ status: string; priority: string; notes: string }>,
  dataDir?: string,
  actor: string = 'dashboard',
): boolean {
  const bugsDir = path.join(dataDir ?? BASE_DATA_DIR, 'bugs');
  if (!fs.existsSync(bugsDir)) return false;

  for (const file of fs.readdirSync(bugsDir).filter(f => f.endsWith('.md'))) {
    const filePath = path.join(bugsDir, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(raw);
    if (data.id !== bugId) continue;

    const now = new Date().toISOString();
    const changelogEntries: string[] = [];

    if (updates.status !== undefined && data.status !== updates.status) {
      changelogEntries.push(`| ${now} | status | ${data.status ?? 'open'} | ${updates.status} | ${actor} |`);
      data.status = updates.status;
    } else if (updates.status !== undefined) {
      data.status = updates.status;
    }

    if (updates.priority !== undefined && data.priority !== updates.priority) {
      changelogEntries.push(`| ${now} | priority | ${data.priority ?? 'P3'} | ${updates.priority} | ${actor} |`);
      data.priority = updates.priority;
    } else if (updates.priority !== undefined) {
      data.priority = updates.priority;
    }

    data.updated = new Date().toISOString().split('T')[0];

    let newContent = content;
    if (updates.notes !== undefined) {
      const oldNotes = extractSection(content, 'Notes');
      if (oldNotes.trim() !== updates.notes.trim()) {
        changelogEntries.push(`| ${now} | notes | (updated) | (updated) | ${actor} |`);
      }
      const sections = content.split(/^## /m);
      let found = false;
      newContent = sections.map((s, i) => {
        if (i === 0) return s;
        if (s.startsWith('Notes')) {
          found = true;
          return `Notes\n${updates.notes}\n\n`;
        }
        return s;
      }).join('## ');
      if (!found) {
        newContent = newContent.trimEnd() + `\n\n## Notes\n${updates.notes}\n`;
      }
    }

    if (changelogEntries.length > 0) {
      newContent = appendChangelog(newContent, changelogEntries);
    }

    fs.writeFileSync(filePath, matter.stringify(newContent, data), 'utf-8');
    return true;
  }
  return false;
}

// --- Jira Dedup ---

export function findBugFileByJiraKey(jiraKey: string, dataDir?: string): string | null {
  const bugsDir = path.join(dataDir ?? BASE_DATA_DIR, 'bugs');
  if (!fs.existsSync(bugsDir)) return null;
  for (const file of fs.readdirSync(bugsDir).filter(f => f.endsWith('.md'))) {
    const filePath = path.join(bugsDir, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data } = matter(raw);
    if (data.jira_key === jiraKey) return filePath;
  }
  return null;
}

// --- Load All ---

export function loadAllTestCases(dataDir?: string): TestCase[] {
  const testsDir = path.join(dataDir ?? BASE_DATA_DIR, 'tests');
  if (!fs.existsSync(testsDir)) return [];

  const tests: TestCase[] = [];
  const categories = fs.readdirSync(testsDir, { withFileTypes: true });

  for (const cat of categories) {
    if (!cat.isDirectory()) continue;
    const catDir = path.join(testsDir, cat.name);
    const files = fs.readdirSync(catDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      try {
        tests.push(readTestCase(path.join(catDir, file)));
      } catch {
        // skip malformed files
      }
    }
  }

  return tests;
}

export function loadAllBugs(dataDir?: string): Bug[] {
  const bugsDir = path.join(dataDir ?? BASE_DATA_DIR, 'bugs');
  if (!fs.existsSync(bugsDir)) return [];

  return fs.readdirSync(bugsDir)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      try { return readBug(path.join(bugsDir, f)); }
      catch { return null; }
    })
    .filter((b): b is Bug => b !== null);
}

export function loadAllCategories(dataDir?: string): Category[] {
  const testsDir = path.join(dataDir ?? BASE_DATA_DIR, 'tests');
  if (!fs.existsSync(testsDir)) return [];

  return fs.readdirSync(testsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => {
      const cat = readCategory(path.join(testsDir, d.name));
      return cat ?? { id: d.name, name: d.name, order: 999 };
    })
    .sort((a, b) => a.order - b.order);
}

export function loadAllRuns(dataDir?: string): TestRun[] {
  const runsDir = path.join(dataDir ?? BASE_DATA_DIR, 'runs');
  if (!fs.existsSync(runsDir)) return [];

  return fs.readdirSync(runsDir)
    .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
    .map(f => {
      try {
        const raw = fs.readFileSync(path.join(runsDir, f), 'utf-8');
        const { data } = matter(raw);
        return data as TestRun;
      } catch { return null; }
    })
    .filter((r): r is TestRun => r !== null)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

// --- Bug Impact (E-016 / S-016-001) ---
// File: data/{projectId}/bugs/{bugId}/impact.md (one per bug, overwrites on regen).

function bugImpactDir(projectDir: string, bugId: string): string {
  return path.join(projectDir, 'bugs', bugId);
}

function bugImpactPath(projectDir: string, bugId: string): string {
  return path.join(bugImpactDir(projectDir, bugId), 'impact.md');
}

function renderRelatedTestsTable(rows: BugImpactRelatedTest[]): string {
  if (rows.length === 0) return '_None._\n';
  let out = '| Test ID | Rationale |\n|---------|-----------|\n';
  for (const r of rows) {
    const safe = (r.rationale || '').replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim();
    out += `| ${r.testId} | ${safe} |\n`;
  }
  return out;
}

function parseRelatedTestsTable(section: string): BugImpactRelatedTest[] {
  const rows: BugImpactRelatedTest[] = [];
  if (!section) return rows;
  const lines = section.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (!line.startsWith('|')) continue;
    if (/^\|\s*-+\s*\|/.test(line)) continue;          // separator row
    if (/^\|\s*Test ID\b/i.test(line)) continue;       // header row
    const cells = line.split('|').slice(1, -1).map(c => c.trim());
    if (cells.length < 2 || !cells[0]) continue;
    rows.push({ testId: cells[0], rationale: cells[1] });
  }
  return rows;
}

export function writeBugImpact(impact: BugImpact, projectDir: string): string {
  const dir = bugImpactDir(projectDir, impact.bugId);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = bugImpactPath(projectDir, impact.bugId);

  const frontmatter: Record<string, unknown> = {
    bugId: impact.bugId,
    generatedAt: impact.generatedAt,
    bugStatus: impact.bugStatus,
    riskScore: Math.max(0, Math.min(1, Number(impact.riskScore.toFixed(3)))),
  };
  if (impact.generatedBy)     frontmatter.generatedBy = impact.generatedBy;
  if (impact.modelDurationMs) frontmatter.modelDurationMs = impact.modelDurationMs;

  let body = '';
  body += '## Related Tests (Rerun)\n\n' + renderRelatedTestsTable(impact.rerun) + '\n';
  body += '## Related Tests (Manual Verify After Fix)\n\n' + renderRelatedTestsTable(impact.manualVerify) + '\n';
  body += '## Repro Narrative\n\n' + (impact.reproNarrative?.trim() || '_None recorded._') + '\n';

  fs.writeFileSync(filePath, matter.stringify(body, frontmatter), 'utf-8');
  return filePath;
}

export function readBugImpact(bugId: string, projectDir: string): BugImpact | null {
  const filePath = bugImpactPath(projectDir, bugId);
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(raw);
    const sections = parseSections(content);
    const score = typeof data.riskScore === 'number' ? data.riskScore : Number(data.riskScore) || 0;
    return {
      bugId: String(data.bugId ?? bugId),
      generatedAt: String(data.generatedAt ?? ''),
      bugStatus: (data.bugStatus ?? 'open') as Bug['status'],
      riskScore: Math.max(0, Math.min(1, score)),
      rerun: parseRelatedTestsTable(sections['Related Tests (Rerun)'] ?? ''),
      manualVerify: parseRelatedTestsTable(sections['Related Tests (Manual Verify After Fix)'] ?? ''),
      reproNarrative: (sections['Repro Narrative'] ?? '').trim(),
      generatedBy: (data.generatedBy ?? undefined) as 'claude' | 'manual' | undefined,
      modelDurationMs: typeof data.modelDurationMs === 'number' ? data.modelDurationMs : undefined,
    };
  } catch (err) {
    console.error('[bug-impact] failed to read ' + filePath + ':', err);
    return null;
  }
}

// --- AppMap Narrative (E-027) ---
// File: data/{projectId}/appmap-narrative.md (one per project, overwrites on regen).
// Mirrors BugImpact: frontmatter + body, persisted via gray-matter, parsed via parseSections.

function appMapNarrativePath(projectDir: string): string {
  return path.join(projectDir, 'appmap-narrative.md');
}

function renderPerFlowTable(flows: AppMapPerFlow[]): string {
  if (!flows.length) return '_None._\n';
  let out = '| Flow | Why Picked | Last Runs Summary | Agent Time (ms) |\n';
  out += '|------|------------|-------------------|-----------------|\n';
  for (const f of flows) {
    const why = (f.whyPicked || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
    const summary = (f.lastRunsSummary || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
    out += `| ${f.flowId} | ${why} | ${summary} | ${f.agentTimeMs || 0} |\n`;
  }
  return out;
}

function parsePerFlowTable(section: string): AppMapPerFlow[] {
  const out: AppMapPerFlow[] = [];
  const lines = (section || '').split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (!line.startsWith('|')) continue;
    if (/^\|\s*-+\s*\|/.test(line)) continue;             // separator row
    if (/^\|\s*Flow\s*\|/i.test(line)) continue;          // header row
    const cells = line.split('|').slice(1, -1).map(c => c.trim().replace(/\\\|/g, '|'));
    if (cells.length < 4) continue;
    const ms = parseInt(cells[3], 10);
    out.push({
      flowId: cells[0],
      whyPicked: cells[1],
      lastRunsSummary: cells[2],
      agentTimeMs: Number.isFinite(ms) ? ms : 0,
    });
  }
  return out;
}

export function writeAppMapNarrative(narrative: AppMapNarrative, projectDir: string): string {
  fs.mkdirSync(projectDir, { recursive: true });
  const filePath = appMapNarrativePath(projectDir);

  const frontmatter: Record<string, unknown> = {
    projectId: narrative.projectId,
    generatedAt: narrative.generatedAt,
    flowsCovered: narrative.flowsCovered,
    testCasesTotal: narrative.testCasesTotal,
    coveragePct: Number(narrative.coveragePct.toFixed(1)),
    timeOnTask: {
      generationMs: Math.max(0, Math.round(narrative.timeOnTask.generationMs)),
      runMs: Math.max(0, Math.round(narrative.timeOnTask.runMs)),
      totalMs: Math.max(0, Math.round(narrative.timeOnTask.totalMs)),
    },
  };
  if (narrative.generatedBy)     frontmatter.generatedBy = narrative.generatedBy;
  if (narrative.modelDurationMs) frontmatter.modelDurationMs = narrative.modelDurationMs;
  if (narrative.qualityFlag)     frontmatter.qualityFlag = narrative.qualityFlag;

  let body = '';
  body += '## Why these flows\n\n' + (narrative.whyTheseFlows?.trim() || '_None recorded._') + '\n\n';
  body += '## What the agent learned\n\n' + (narrative.whatTheAgentLearned?.trim() || '_None recorded._') + '\n\n';
  body += '## Per-Flow Detail\n\n' + renderPerFlowTable(narrative.perFlow) + '\n';

  fs.writeFileSync(filePath, matter.stringify(body, frontmatter), 'utf-8');
  return filePath;
}

export function readAppMapNarrative(projectDir: string): AppMapNarrative | null {
  const filePath = appMapNarrativePath(projectDir);
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(raw);
    const sections = parseSections(content);
    const time = (data.timeOnTask ?? {}) as Record<string, unknown>;
    return {
      projectId: String(data.projectId ?? ''),
      generatedAt: String(data.generatedAt ?? ''),
      generatedBy: (data.generatedBy ?? undefined) as 'claude' | 'manual' | undefined,
      modelDurationMs: typeof data.modelDurationMs === 'number' ? data.modelDurationMs : undefined,
      flowsCovered: typeof data.flowsCovered === 'number' ? data.flowsCovered : Number(data.flowsCovered) || 0,
      testCasesTotal: typeof data.testCasesTotal === 'number' ? data.testCasesTotal : Number(data.testCasesTotal) || 0,
      coveragePct: typeof data.coveragePct === 'number' ? data.coveragePct : Number(data.coveragePct) || 0,
      qualityFlag: data.qualityFlag === 'generic' ? 'generic' : undefined,
      whyTheseFlows: (sections['Why these flows'] ?? '').trim(),
      whatTheAgentLearned: (sections['What the agent learned'] ?? '').trim(),
      timeOnTask: {
        generationMs: typeof time.generationMs === 'number' ? time.generationMs : Number(time.generationMs) || 0,
        runMs: typeof time.runMs === 'number' ? time.runMs : Number(time.runMs) || 0,
        totalMs: typeof time.totalMs === 'number' ? time.totalMs : Number(time.totalMs) || 0,
      },
      perFlow: parsePerFlowTable(sections['Per-Flow Detail'] ?? ''),
    };
  } catch (err) {
    console.error('[appmap-narrative] failed to read ' + filePath + ':', err);
    return null;
  }
}

// --- Healing Proposals (E-017) ---
// File: data/{projectId}/healing/proposal-{id}.md
// Hierarchy snapshot: data/{projectId}/healing/proposal-{id}.hierarchy.txt

function healingDir(projectDir: string): string {
  return path.join(projectDir, 'healing');
}

function healingPath(projectDir: string, id: string): string {
  return path.join(healingDir(projectDir), 'proposal-' + id + '.md');
}

export function writeHealingProposal(p: HealingProposal, projectDir: string): string {
  fs.mkdirSync(healingDir(projectDir), { recursive: true });
  const filePath = healingPath(projectDir, p.id);

  const fm: Record<string, unknown> = {
    id: p.id,
    runId: p.runId,
    testId: p.testId,
    flowPath: p.flowPath,
    platform: p.platform,
    failedSelector: p.failedSelector,
    state: p.state,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
  if (p.failureLine !== undefined)        fm.failureLine = p.failureLine;
  if (p.errorLine)                        fm.errorLine = p.errorLine;
  if (p.proposedSelector !== undefined)   fm.proposedSelector = p.proposedSelector;
  if (p.modifiedSelector !== undefined)   fm.modifiedSelector = p.modifiedSelector;
  if (p.confidence !== undefined)         fm.confidence = Number(p.confidence.toFixed(3));
  if (p.hierarchySnapshotPath)            fm.hierarchySnapshotPath = p.hierarchySnapshotPath;
  if (p.validationRunId)                  fm.validationRunId = p.validationRunId;
  if (p.appliedAt)                        fm.appliedAt = p.appliedAt;
  if (p.errorReason)                      fm.errorReason = p.errorReason;

  let body = '';
  body += '## Failure Context\n\n';
  body += '- runId: `' + p.runId + '`\n';
  body += '- testId: `' + p.testId + '`\n';
  body += '- platform: ' + p.platform + '\n';
  body += '- failedSelector: `' + p.failedSelector + '`\n';
  if (p.errorLine) body += '- errorLine: `' + p.errorLine + '`\n';
  body += '\n';
  if (p.rationale) {
    body += '## Rationale (Claude)\n\n' + p.rationale.trim() + '\n\n';
  }
  if (p.rawClaudeResponse && p.state === 'error') {
    body += '## Raw Claude Response (parse failed)\n\n```\n' + p.rawClaudeResponse.slice(0, 4000) + '\n```\n\n';
  }

  fs.writeFileSync(filePath, matter.stringify(body, fm), 'utf-8');
  return filePath;
}

export function readHealingProposal(id: string, projectDir: string): HealingProposal | null {
  const filePath = healingPath(projectDir, id);
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(raw);
    const sections = parseSections(content);
    const rationale = (sections['Rationale (Claude)'] ?? '').trim() || undefined;
    const rawResp = (sections['Raw Claude Response (parse failed)'] ?? '').trim() || undefined;
    return {
      id: String(data.id ?? id),
      runId: String(data.runId ?? ''),
      testId: String(data.testId ?? ''),
      flowPath: String(data.flowPath ?? ''),
      platform: String(data.platform ?? ''),
      failedSelector: String(data.failedSelector ?? ''),
      failureLine: typeof data.failureLine === 'number' ? data.failureLine : undefined,
      errorLine: typeof data.errorLine === 'string' ? data.errorLine : undefined,
      state: (data.state ?? 'requested') as HealingState,
      proposedSelector: typeof data.proposedSelector === 'string' ? data.proposedSelector : undefined,
      modifiedSelector: typeof data.modifiedSelector === 'string' ? data.modifiedSelector : undefined,
      confidence: typeof data.confidence === 'number' ? data.confidence : undefined,
      rationale,
      hierarchySnapshotPath: typeof data.hierarchySnapshotPath === 'string' ? data.hierarchySnapshotPath : undefined,
      validationRunId: typeof data.validationRunId === 'string' ? data.validationRunId : undefined,
      createdAt: String(data.createdAt ?? new Date().toISOString()),
      updatedAt: String(data.updatedAt ?? new Date().toISOString()),
      appliedAt: typeof data.appliedAt === 'string' ? data.appliedAt : undefined,
      errorReason: typeof data.errorReason === 'string' ? data.errorReason : undefined,
      rawClaudeResponse: rawResp,
    };
  } catch (err) {
    console.error('[healing] failed to read ' + filePath + ':', err);
    return null;
  }
}

export function loadAllHealingProposals(projectDir: string): HealingProposal[] {
  const dir = healingDir(projectDir);
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => f.startsWith('proposal-') && f.endsWith('.md'));
  const out: HealingProposal[] = [];
  for (const f of files) {
    const id = f.replace(/^proposal-/, '').replace(/\.md$/, '');
    const p = readHealingProposal(id, projectDir);
    if (p) out.push(p);
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// --- Project Registry ---

export function loadProjectRegistry(): import('../types.js').ProjectRegistry {
  const regPath = path.join(BASE_DATA_DIR, 'projects.json');
  if (!fs.existsSync(regPath)) {
    return { activeProject: '', projects: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(regPath, 'utf-8'));
  } catch {
    return { activeProject: '', projects: [] };
  }
}

export function saveProjectRegistry(registry: import('../types.js').ProjectRegistry): void {
  fs.mkdirSync(BASE_DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(BASE_DATA_DIR, 'projects.json'), JSON.stringify(registry, null, 2), 'utf-8');
}

export function loadProjectConfig(projectId: string): import('../types.js').ProjectConfig | null {
  const configPath = path.join(BASE_DATA_DIR, projectId, 'config.json');
  if (!fs.existsSync(configPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    return null;
  }
}

export function saveProjectConfig(config: import('../types.js').ProjectConfig): void {
  const projectDir = path.join(BASE_DATA_DIR, config.id);
  fs.mkdirSync(projectDir, { recursive: true });
  fs.mkdirSync(path.join(projectDir, 'tests'), { recursive: true });
  fs.mkdirSync(path.join(projectDir, 'bugs'), { recursive: true });
  fs.mkdirSync(path.join(projectDir, 'runs'), { recursive: true });
  fs.mkdirSync(path.join(projectDir, 'screenshots'), { recursive: true });
  fs.writeFileSync(path.join(projectDir, 'config.json'), JSON.stringify(config, null, 2), 'utf-8');
}

// --- Helpers ---

function parseSections(content: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = content.split('\n');
  let currentSection = '';
  let currentContent: string[] = [];

  for (const line of lines) {
    const match = line.match(/^##\s+(.+)$/);
    if (match) {
      if (currentSection) {
        sections[currentSection] = currentContent.join('\n').trim();
      }
      currentSection = match[1];
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentSection) {
    sections[currentSection] = currentContent.join('\n').trim();
  }

  return sections;
}

function parseDeviceResultsTable(table: string): Array<{ device: string; status: TestStatus; run?: string; timestamp?: string }> {
  const rows = table.split('\n').filter(r => r.startsWith('|') && !r.includes('---'));
  return rows.slice(1).map(row => {
    const cells = row.split('|').map(c => c.trim()).filter(Boolean);
    return {
      device: cells[0] ?? '',
      status: (cells[1] as TestStatus) ?? 'not-run',
      run: cells[2] || undefined,
      timestamp: cells[3] || undefined,
    };
  });
}

function parseHistoryTable(table: string): Array<{ test: string; status: TestStatus; device?: string }> {
  const rows = table.split('\n').filter(r => r.startsWith('|') && !r.includes('---'));
  return rows.slice(1).map(row => {
    const cells = row.split('|').map(c => c.trim()).filter(Boolean);
    return {
      test: cells[0] ?? '',
      status: (cells[1] as TestStatus) ?? 'not-run',
      device: cells[2] || undefined,
    };
  });
}

function parseChangelogTable(table: string): ChangelogEntry[] {
  const rows = table.split('\n').filter(r => r.startsWith('|') && !r.includes('---'));
  return rows.slice(1).map(row => {
    const cells = row.split('|').map(c => c.trim()).filter(Boolean);
    return {
      timestamp: cells[0] ?? '',
      field: cells[1] ?? '',
      oldValue: cells[2] ?? '',
      newValue: cells[3] ?? '',
      actor: cells[4] ?? 'dashboard',
    };
  });
}

function parseSelectorTable(table: string): Array<{ line: number; command: string; issue: string }> {
  const rows = table.split('\n').filter(r => r.startsWith('|') && !r.includes('---'));
  return rows.slice(1).map(row => {
    const cells = row.split('|').map(c => c.trim()).filter(Boolean);
    return {
      line: parseInt(cells[0] ?? '0', 10),
      command: (cells[1] ?? '').replace(/`/g, ''),
      issue: cells[2] ?? '',
    };
  });
}
