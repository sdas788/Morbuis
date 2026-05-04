// E-023 / S-023-002: PMAgent project parser (read-only).
// Walks <pmagentPath>/epics/E-NNN-*/E-NNN.md + S-NNN-NNN-*.md story files (and optional
// T-NNN-NNN-*.md test plans) and returns a `ParsedExcel`-shaped object plus a source map.
// The output is consumed by the existing `writeParsedExcel` writer in src/parsers/excel.ts —
// no new write paths are introduced. PMAgent files are never modified.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import matter from 'gray-matter';
import type { TestCase, Priority, PMAgentSource } from '../types.js';
import type { ParsedExcel, ParsedCategory } from './excel.js';

export interface PMAgentParseResult {
  parsed: ParsedExcel;
  sourceMap: Map<string, PMAgentSource>;   // testId → source backreference
  warnings: string[];                       // per-file parse issues; not fatal
}

const NEGATIVE_KEYWORDS = /\b(error|invalid|fail|expired|denied|missing|empty|cannot|wrong|deny)\b/i;
const EDGE_KEYWORDS = /\b(boundary|max|min|edge|exactly|limit|overflow|underflow|long|short)\b/i;

/**
 * Parse a PMAgent project folder. Read-only on PMAgent side — the parser never writes
 * back. The slug parameter governs both backreference data (`PMAgentSource.slug`) and
 * the recursion guard for the special `morbius` project where the symlink points back
 * into Morbius's own repo.
 */
export function parsePMAgentProject(pmagentPath: string, slug: string): PMAgentParseResult {
  const realRoot = fs.realpathSync(pmagentPath);
  // Detect "self-parse" — the morbius PMAgent project symlinks into Morbius/requirements.
  // When parsing self, skip our OWN epic (E-023) so we don't recurse on a future re-parse
  // that would add E-023's spec stories as test cases against E-023's spec stories.
  const epicsDir = path.join(realRoot, 'epics');
  const warnings: string[] = [];
  const result: PMAgentParseResult = {
    parsed: { categories: [], totalTestCases: 0, skippedSheets: [], excelMtime: '', checksums: {} },
    sourceMap: new Map(),
    warnings,
  };

  if (!fs.existsSync(epicsDir)) {
    warnings.push('No epics/ directory at ' + epicsDir);
    return result;
  }

  const epicFolders = fs.readdirSync(epicsDir)
    .filter(n => /^E-\d+/.test(n))
    .map(n => path.join(epicsDir, n))
    .filter(p => { try { return fs.statSync(p).isDirectory(); } catch { return false; } })
    .sort();

  let order = 0;
  let latestMtime = 0;

  for (const epicFolder of epicFolders) {
    const epicMd = findEpicMarkdown(epicFolder);
    if (!epicMd) { warnings.push('No E-NNN.md inside ' + epicFolder); continue; }

    const epicData = readFrontmatter(epicMd);
    if (!epicData) { warnings.push('Failed to parse epic frontmatter: ' + epicMd); continue; }

    const epicId = String(epicData.frontmatter.ID ?? epicData.frontmatter.id ?? path.basename(epicFolder).match(/^E-(\d+)/)?.[0] ?? '');
    if (!epicId) { warnings.push('Epic missing ID: ' + epicMd); continue; }

    // Recursion guard: skip OUR OWN E-023 when self-parsing the morbius project.
    // Detection: the resolved epic path lives inside Morbius's own requirements folder
    // AND the epic id is E-023. We do NOT skip other Morbius epics (E-013..E-022) —
    // they're real source spec for "Morbius testing Morbius" tests.
    if (epicId === 'E-023' && fs.realpathSync(epicMd).includes('/Morbius/requirements/')) {
      result.parsed.skippedSheets.push(epicId + ' (self-reference recursion guard)');
      continue;
    }

    // Derive epic title from the H1 line `# Epic: <Title>`
    const epicTitle = (epicData.h1.replace(/^#\s*Epic:\s*/i, '').trim()) || epicId;
    const categorySlug = slugify(epicId + '-' + epicTitle);
    const category: ParsedCategory = {
      id: categorySlug,
      name: epicTitle,
      sheet: epicId,
      order: order++,
      testCases: [],
    };

    // Collect story files + their sibling test plans
    const storyFiles = fs.readdirSync(epicFolder)
      .filter(n => /^S-\d+-\d+.*\.md$/.test(n) && !n.endsWith('.v2.md'))
      .map(n => path.join(epicFolder, n))
      .sort();

    const testPlanFiles = fs.readdirSync(epicFolder)
      .filter(n => /^T-\d+-\d+.*\.md$/.test(n))
      .map(n => path.join(epicFolder, n));

    // Index test plans by the storyId they reference (frontmatter `Story:` field)
    const testPlanByStory = new Map<string, string>();
    for (const tp of testPlanFiles) {
      const tpData = readFrontmatter(tp);
      if (!tpData) continue;
      const storyRef = String(tpData.frontmatter.Story ?? tpData.frontmatter.story ?? '');
      if (storyRef) testPlanByStory.set(storyRef.trim(), tp);
    }

    for (const storyFile of storyFiles) {
      const storyData = readFrontmatter(storyFile);
      if (!storyData) { warnings.push('Failed to parse story: ' + storyFile); continue; }

      const storyId = String(storyData.frontmatter.ID ?? storyData.frontmatter.id ?? '');
      if (!storyId) { warnings.push('Story missing ID: ' + storyFile); continue; }

      const storyTitle = (storyData.h1.replace(/^#\s*Story:\s*/i, '').trim()) || storyId;
      const storyPriority = String(storyData.frontmatter.Priority ?? storyData.frontmatter.priority ?? 'P2').toUpperCase();
      const morbiusPriority = mapPriority(storyPriority);
      const storyMtime = fs.statSync(storyFile).mtimeMs;
      if (storyMtime > latestMtime) latestMtime = storyMtime;

      // Source priority: prefer T-*.md test plan when present; otherwise parse story AC.
      const tp = testPlanByStory.get(storyId);
      const acRows: Array<{ acIndex: number; rawText: string; title: string; steps: string; acceptanceCriteria: string; sourcePath: string; }> = [];

      if (tp) {
        // Future: parse T-*.md test plan rows. v1 reads its full body as a single test case
        // (since no real T-*.md files exist yet — see plan constraint C1). Improve later.
        const tpData = readFrontmatter(tp);
        const tpBody = tpData?.body ?? '';
        const tpMtime = fs.statSync(tp).mtimeMs;
        if (tpMtime > latestMtime) latestMtime = tpMtime;
        acRows.push({
          acIndex: 0,
          rawText: tpBody.slice(0, 4000),
          title: storyTitle + ' — Test Plan',
          steps: tpBody.slice(0, 2000),
          acceptanceCriteria: tpBody.slice(0, 2000),
          sourcePath: tp,
        });
      } else {
        // Parse the story's `## Acceptance Criteria` section
        const acSection = extractSection(storyData.body, 'Acceptance Criteria');
        const acs = splitACs(acSection);
        if (acs.length === 0) {
          warnings.push('No ACs parsed from ' + storyFile + ' — skipping');
          continue;
        }
        for (let i = 0; i < acs.length; i++) {
          const ac = acs[i];
          acRows.push({
            acIndex: i,
            rawText: ac,
            title: deriveTitle(ac, storyTitle, i),
            steps: gwtToSteps(ac),
            acceptanceCriteria: ac,
            sourcePath: storyFile,
          });
        }
      }

      for (const row of acRows) {
        const checksum = sha256Norm(row.rawText);
        const testId = 'TC-' + slug.toUpperCase().slice(0, 3) + '-' + storyId.replace(/^S-/, '') + '-' + (row.acIndex + 1);
        const scenario = pickScenario(row.rawText, row.acIndex);

        const tc: TestCase = {
          id: testId,
          title: row.title,
          category: category.id,
          scenario,
          status: 'not-run',
          priority: morbiusPriority,
          steps: row.steps,
          acceptanceCriteria: row.acceptanceCriteria,
          notes: '',
          platforms: ['android', 'ios'],
          tags: [storyId.toLowerCase(), epicId.toLowerCase()],
          deviceResults: [],
          history: [],
          created: new Date().toISOString().split('T')[0],
          updated: new Date().toISOString().split('T')[0],
          pmagentSource: {
            slug,
            storyId,
            acIndex: row.acIndex,
            sourcePath: row.sourcePath,
            sourceChecksum: checksum,
          },
        };

        category.testCases.push(tc);
        result.parsed.totalTestCases++;
        result.parsed.checksums[storyId + ':' + row.acIndex] = checksum;
        result.sourceMap.set(testId, tc.pmagentSource!);
      }
    }

    if (category.testCases.length > 0) {
      result.parsed.categories.push(category);
    } else {
      result.parsed.skippedSheets.push(epicId + ' (no parseable ACs)');
    }
  }

  result.parsed.excelMtime = new Date(latestMtime || Date.now()).toISOString();
  return result;
}

// ─── helpers ────────────────────────────────────────────────────────────────

function findEpicMarkdown(epicFolder: string): string | null {
  const candidates = fs.readdirSync(epicFolder).filter(n => /^E-\d+\.md$/.test(n));
  return candidates.length > 0 ? path.join(epicFolder, candidates[0]) : null;
}

function readFrontmatter(filePath: string): { frontmatter: Record<string, unknown>; body: string; h1: string } | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    // Some PMAgent files have frontmatter as **bold metadata** lines instead of YAML
    // (the project doesn't enforce YAML — just markdown). Parse both forms.
    const m = matter(raw);
    const yamlFm = (m.data as Record<string, unknown>) ?? {};
    const body = m.content;
    const lines = raw.split('\n');
    const h1 = lines.find(l => /^#\s+/.test(l)) ?? '';
    // Also scan **Key:** value markdown-style metadata into the same object
    const mdFm: Record<string, unknown> = {};
    for (const line of lines) {
      const mm = line.match(/^\*\*([^*]+):\*\*\s*(.+)$/);
      if (mm) mdFm[mm[1].trim()] = mm[2].trim();
    }
    return { frontmatter: { ...mdFm, ...yamlFm }, body, h1 };
  } catch { return null; }
}

function extractSection(body: string, heading: string): string {
  // Capture text between `## <heading>` and the next `## ` (or EOF)
  const re = new RegExp('^##\\s+' + escapeRe(heading) + '\\s*$', 'mi');
  const match = re.exec(body);
  if (!match) return '';
  const start = match.index + match[0].length;
  const after = body.slice(start);
  const next = after.search(/^##\s+/m);
  return (next < 0 ? after : after.slice(0, next)).trim();
}

function splitACs(section: string): string[] {
  if (!section) return [];
  const lines = section.split('\n');
  const acs: string[] = [];
  let current = '';
  const isBulletStart = (l: string) => /^\s*(-\s*\[\s*[xX ]?\s*\]|-\s+|\d+[.)]\s+|\*\*Given\*\*)/.test(l);
  for (const line of lines) {
    if (isBulletStart(line)) {
      if (current.trim()) acs.push(normalizeAC(current));
      current = line;
    } else {
      current += '\n' + line;
    }
  }
  if (current.trim()) acs.push(normalizeAC(current));
  return acs.filter(a => a.length > 5);
}

function normalizeAC(text: string): string {
  // Strip leading bullet markers / checkbox / numbering, and strip Given/When/Then bold
  // markers (`**Given**` → `Given`) so downstream extraction sees clean text.
  return text.trim()
    .replace(/^-\s*\[\s*[xX ]?\s*\]\s*/, '')
    .replace(/^-\s+/, '')
    .replace(/^\d+[.)]\s+/, '')
    .replace(/\*\*(Given|When|Then|And|But)\*\*/gi, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function deriveTitle(ac: string, storyTitle: string, acIndex: number): string {
  // Strip any residual markdown/bold artifacts before deriving the title.
  const cleaned = ac.replace(/\*+/g, '').replace(/[`_]/g, '').replace(/\s+/g, ' ').trim();
  // Try to derive a short title from "Given <X>, when <Y>, then <Z>" — use the When clause.
  const m = cleaned.match(/when\s+([^,]+?)[,]\s*then/i);
  if (m && m[1].length > 5 && m[1].length <= 80) {
    return capitalize(m[1].trim().replace(/[.;]+$/, ''));
  }
  const fallback = cleaned.slice(0, 70).trim();
  return fallback.length > 5 ? fallback : (storyTitle + ' — AC ' + (acIndex + 1));
}

function gwtToSteps(ac: string): string {
  // Produce a Given / When / Then numbered step list when the AC follows that pattern.
  const lower = ac.toLowerCase();
  const gIdx = lower.search(/\bgiven\b/);
  const wIdx = lower.search(/\bwhen\b/);
  const tIdx = lower.search(/\bthen\b/);
  if (gIdx < 0 || wIdx < gIdx || tIdx < wIdx) return ac.trim();
  const given = ac.slice(gIdx, wIdx).replace(/^given\s+/i, '').replace(/[,]\s*$/, '').trim();
  const when = ac.slice(wIdx, tIdx).replace(/^when\s+/i, '').replace(/[,]\s*$/, '').trim();
  const then = ac.slice(tIdx).replace(/^then\s+/i, '').trim();
  return [
    '1. **Setup:** ' + given,
    '2. **Action:** ' + when,
    '3. **Assert:** ' + then,
  ].join('\n');
}

function pickScenario(text: string, acIndex: number): string {
  if (NEGATIVE_KEYWORDS.test(text)) return 'Negative';
  if (EDGE_KEYWORDS.test(text)) return 'Edge Case';
  return acIndex === 0 ? 'Happy Path' : 'Detour';
}

function mapPriority(p: string): Priority {
  // Stories use P0/P1/P2/P3; Morbius uses P1/P2/P3/P4. Shift by one band.
  if (p === 'P0') return 'P1';
  if (p === 'P1') return 'P2';
  if (p === 'P2') return 'P3';
  return 'P4';
}

function slugify(text: string): string {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

function sha256Norm(text: string): string {
  const norm = text.replace(/\s+/g, ' ').trim().toLowerCase();
  return crypto.createHash('sha256').update(norm).digest('hex').slice(0, 16);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function capitalize(s: string): string {
  return s.length === 0 ? s : (s[0].toUpperCase() + s.slice(1));
}

// ─────────────────────────────────────────────────────────────────────────────
// E-023 (extension): Publish Morbius test cases back as PMAgent T-*.md test plans.
// Renders one T-{epicNum}-{storyNum}-*.md per story so PMAgent's QA tab picks them up.
// Format strictly matches /Users/sdas/PMAgent/prompts/templates/test-plan.md.
// Read-write on PMAgent FILESYSTEM (writing into projects/<slug>/epics/.../T-*.md);
// PMAgent code itself is NOT modified.
// ─────────────────────────────────────────────────────────────────────────────

export interface PublishResult {
  ok: true;
  testPlansWritten: number;
  testPlansSkipped: number;
  perStory: Array<{ storyId: string; epicId: string; filePath: string; testCaseCount: number; status: 'created' | 'updated' | 'unchanged' }>;
}

export interface PublishError { ok: false; error: string; }

export function publishTestPlansToPMAgent(opts: {
  slug: string;
  pmagentPath: string;
  morbiusTestCases: TestCase[];
  force?: boolean;
}): PublishResult | PublishError {
  if (!fs.existsSync(opts.pmagentPath)) {
    return { ok: false, error: 'PMAgent path missing: ' + opts.pmagentPath };
  }
  // Group Morbius test cases by source story
  const byStory = new Map<string, { tests: TestCase[]; epicId: string; storyId: string; sourcePath: string }>();
  for (const tc of opts.morbiusTestCases) {
    const src = tc.pmagentSource;
    if (!src || !src.storyId) continue;
    // Derive epic id from story id (e.g. S-013-001 → E-013)
    const m = src.storyId.match(/^S-(\d+)-/);
    if (!m) continue;
    const epicId = 'E-' + m[1];
    const key = src.storyId;
    if (!byStory.has(key)) byStory.set(key, { tests: [], epicId, storyId: src.storyId, sourcePath: src.sourcePath });
    byStory.get(key)!.tests.push(tc);
  }

  const perStory: PublishResult['perStory'] = [];
  let written = 0, skipped = 0;

  for (const [storyId, group] of byStory) {
    // Find the epic folder by walking projects/<slug>/epics/E-NNN-*
    const epicsDir = path.join(opts.pmagentPath, 'epics');
    if (!fs.existsSync(epicsDir)) { skipped++; continue; }
    const epicFolder = fs.readdirSync(epicsDir).find(n => n.startsWith(group.epicId + '-'));
    if (!epicFolder) {
      perStory.push({ storyId, epicId: group.epicId, filePath: '(epic folder not found)', testCaseCount: group.tests.length, status: 'unchanged' });
      skipped++;
      continue;
    }
    const epicDir = path.join(epicsDir, epicFolder);

    // Sort tests by AC index ascending so the Happy Path (AC #1) becomes the P0 core flow
    const tests = [...group.tests].sort((a, b) => (a.pmagentSource!.acIndex - b.pmagentSource!.acIndex));

    // Filename: T-{epicNum}-{storyNum}-{slug}.md
    const epicNum = group.epicId.replace(/^E-/, '');
    const storyNum = storyId.replace(/^S-\d+-/, '');
    const titleSlug = slugify(storyId + '-test-plan');
    const fileName = 'T-' + epicNum + '-' + storyNum + '-' + titleSlug + '.md';
    const filePath = path.join(epicDir, fileName);

    const today = new Date().toISOString().split('T')[0];
    // If a T-*.md already exists for this story (any filename) we update IT instead of creating a duplicate.
    const existing = fs.readdirSync(epicDir).find(n => new RegExp('^T-' + epicNum + '-' + storyNum + '(-|\\.)').test(n));
    const targetPath = existing ? path.join(epicDir, existing) : filePath;

    const newBody = renderTestPlanMarkdown({
      slug: opts.slug,
      epicId: group.epicId,
      storyId,
      tests,
      today,
    });

    let status: 'created' | 'updated' | 'unchanged' = 'created';
    if (fs.existsSync(targetPath)) {
      const oldBody = fs.readFileSync(targetPath, 'utf-8');
      if (oldBody === newBody && !opts.force) { status = 'unchanged'; skipped++; }
      else { status = 'updated'; written++; }
    } else { status = 'created'; written++; }

    if (status !== 'unchanged') {
      fs.writeFileSync(targetPath, newBody, 'utf-8');
    }
    perStory.push({ storyId, epicId: group.epicId, filePath: targetPath, testCaseCount: tests.length, status });
  }

  return { ok: true, testPlansWritten: written, testPlansSkipped: skipped, perStory };
}

function renderTestPlanMarkdown(args: {
  slug: string;
  epicId: string;
  storyId: string;
  tests: TestCase[];
  today: string;
}): string {
  const { slug, epicId, storyId, tests, today } = args;
  const epicNum = epicId.replace(/^E-/, '');
  const storyNum = storyId.replace(/^S-\d+-/, '');
  const planId = 'T-' + epicNum + '-' + storyNum;

  // Best-effort story title — use the first test case's title prefix or the storyId
  const storyTitle = (tests[0]?.title || '').split(/[—:.]/)[0].trim() || storyId;

  // Number test cases per PMAgent format: TC-{epicNum}-{storyNum}-{NNN} (3-digit)
  const numbered = tests.map((tc, i) => ({
    tc,
    pmagentTcId: 'TC-' + epicNum + '-' + storyNum + '-' + String(i + 1).padStart(3, '0'),
    morbiusId: tc.id,
    acIndex: tc.pmagentSource?.acIndex ?? i,
  }));

  const acCovTable = numbered.map(n => {
    const acLabel = 'AC-' + String(n.acIndex + 1).padStart(3, '0');
    const tag = n.tc.scenario === 'Happy Path' ? n.pmagentTcId + ' (P0)' : n.pmagentTcId;
    return '| ' + acLabel + ' | ' + tag + ' | ✓ |';
  }).join('\n');

  // Core Test Flow: the first happy-path (or first overall) test case is P0
  const corePick = numbered.find(n => n.tc.scenario === 'Happy Path') || numbered[0];
  const subFlows = numbered.filter(n => n !== corePick);

  const renderTC = (n: typeof numbered[number], priority: string, type: string) => {
    const acLabel = 'AC-' + String(n.acIndex + 1).padStart(3, '0');
    const stepsLines = (n.tc.steps || '').split('\n').map(l => l.trim()).filter(Boolean);
    const stepsBlock = stepsLines.length > 0
      ? stepsLines.map((line, i) => {
          // If the line already starts with "1." etc, strip the leading numbering
          const cleaned = line.replace(/^\d+[.)]\s*/, '').replace(/^\*\*[^*]+:\*\*\s*/, '');
          return (i + 1) + '. ' + cleaned;
        }).join('\n')
      : '1. (no steps recorded)';
    const expected = (n.tc.acceptanceCriteria || '').trim() || '(see AC ' + acLabel + ')';
    return [
      '### ' + n.pmagentTcId + ': ' + n.tc.title.replace(/[\r\n]+/g, ' ').slice(0, 120),
      '',
      '**Type:** ' + type,
      '**Priority:** ' + priority,
      '**AC Covered:** ' + acLabel,
      '**Dependencies:** None',
      '',
      '<!-- Morbius source: ' + n.morbiusId + ' (sourceChecksum=' + (n.tc.pmagentSource?.sourceChecksum || '?') + ') -->',
      '',
      '**Preconditions:**',
      '- (derived from story prerequisites — fill in or leave empty)',
      '',
      '**Steps:**',
      stepsBlock,
      '',
      '**Expected Result:**',
      expected,
      '',
      '**Failure Indicators:**',
      '- (describe the wrong behavior; populate during real test authoring)',
    ].join('\n');
  };

  const lines: string[] = [];
  lines.push('# Test Plan: ' + storyTitle);
  lines.push('');
  lines.push('**ID:** ' + planId);
  lines.push('**Project:** ' + slug);
  lines.push('**Story:** ' + storyId);
  lines.push('**Epic:** ' + epicId);
  lines.push('**Version:** 1.0');
  lines.push('**Created:** ' + today);
  lines.push('**Updated:** ' + today);
  lines.push('');
  lines.push('> _Generated from Morbius test cases (E-023 publish-back). ' + tests.length + ' test case(s) sourced from `' + slug + ':' + storyId + '`._');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Scope');
  lines.push('');
  lines.push('Verification of ' + storyId + ' acceptance criteria. ' + tests.length + ' test case(s) span the happy path plus negative and edge variations.');
  lines.push('');
  lines.push('## Prerequisites');
  lines.push('');
  lines.push('- (Inherit from story Prerequisites; fill in environment + data setup before authoring)');
  lines.push('');
  lines.push('## AC Coverage Map');
  lines.push('');
  lines.push('| AC | Test Cases | Coverage |');
  lines.push('|----|-----------|----------|');
  lines.push(acCovTable);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Core Test Flow');
  lines.push('');
  lines.push('> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.');
  lines.push('');
  if (corePick) {
    lines.push(renderTC(corePick, 'P0', 'E2E'));
    lines.push('');
    lines.push('---');
    lines.push('');
  }
  lines.push('## Sub Flows');
  lines.push('');
  lines.push('> All test cases beyond the core flow. Negative scenarios, edge cases, and regression guards.');
  lines.push('');
  for (const n of subFlows) {
    const type = n.tc.scenario === 'Negative' ? 'Negative' : (n.tc.scenario === 'Edge Case' ? 'Edge Case' : 'Detour');
    const priority = type === 'Negative' ? 'P1' : 'P2';
    lines.push(renderTC(n, priority, type));
    lines.push('');
    lines.push('---');
    lines.push('');
  }
  lines.push('## Out of Scope');
  lines.push('');
  lines.push('- (Items intentionally excluded — derive from story Do Not Do / Future Scope sections)');
  lines.push('');
  lines.push('## Automation Notes');
  lines.push('');
  lines.push('- **Data setup:** (specify seeded data or test accounts)');
  lines.push('- **Selector strategy:** (Maestro YAML — prefer text matching with stable copy)');
  lines.push('- **Flakiness risks:** (network calls, timing, animations)');
  lines.push('- **Suggested framework:** Maestro (mobile) — see `' + (tests[0]?.maestroFlow || '(no flow linked)') + '`');
  lines.push('- **Automation priority:** ' + (corePick?.pmagentTcId || 'P0 first'));
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Change Log');
  lines.push('');
  lines.push('| Date | Version | Author | Change |');
  lines.push('|------|---------|--------|--------|');
  lines.push('| ' + today + ' | 1.0 | Morbius (publish-back) | Generated from ' + tests.length + ' Morbius test case(s) |');
  lines.push('');

  return lines.join('\n');
}
