#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import { startServer } from './server.js';
import { importExcel, exportToExcel } from './parsers/excel.js';
import { parseMaestroOutput } from './parsers/maestro-results.js';
import { writeBug, loadAllTestCases, loadAllBugs, loadProjectRegistry, getDataDir } from './parsers/markdown.js';
import { analyzeSelectors } from './analyzer.js';
import { parseMaestroYaml } from './parsers/maestro-yaml.js';
import yaml from 'js-yaml';
import matter from 'gray-matter';
import type { Bug, Priority } from './types.js';
import { generateFlows } from './generators/maestro-flows.js';
import { DATA_DIR } from './data-dir.js';

function nextBugId(bugsDir: string): string {
  if (!fs.existsSync(bugsDir)) return 'BUG-001';
  const existing = fs.readdirSync(bugsDir).filter(f => f.endsWith('.md'));
  let maxNum = 0;
  for (const f of existing) {
    const match = f.match(/bug-(\d+)/i);
    if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10));
  }
  return `BUG-${String(maxNum + 1).padStart(3, '0')}`;
}

function getActiveDataDir(): string {
  const registry = loadProjectRegistry();
  if (registry.activeProject) return path.join(DATA_DIR, registry.activeProject);
  if (fs.existsSync(path.join(DATA_DIR, 'tests'))) return DATA_DIR;
  return DATA_DIR;
}

const program = new Command();

program
  .name('morbius')
  .description('Visual QA dashboard for Maestro + Claude Code')
  .version('0.1.0');

program
  .command('serve')
  .description('Start the Morbius dashboard server')
  .option('-p, --port <port>', 'Port number', process.env.PORT || '3000')
  .action((opts) => {
    const port = parseInt(opts.port, 10);
    startServer(port);
  });

program
  .command('import <xlsx-path>')
  .description('Import test cases from an Excel file into markdown')
  .action((xlsxPath: string) => {
    const dataDir = getActiveDataDir();
    const registry = loadProjectRegistry();
    const projectName = registry.activeProject || 'default';
    console.log(`\n  Importing from: ${xlsxPath}`);
    console.log(`  Project: ${projectName}\n`);
    try {
      const result = importExcel(xlsxPath, dataDir);
      console.log(`  ✓ ${result.categories} categories created`);
      console.log(`  ✓ ${result.testCases} test cases imported`);
      if (result.skippedSheets.length > 0) {
        console.log(`  ○ ${result.skippedSheets.length} sheets skipped: ${result.skippedSheets.join(', ')}`);
      }
      console.log(`\n  Data written to: ${path.relative(process.cwd(), dataDir)}/tests/`);
      console.log(`  Run 'morbius serve' to view the dashboard.\n`);
    } catch (err) {
      console.error(`  ✗ Import failed: ${err}`);
      process.exit(1);
    }
  });

program
  .command('ingest <maestro-output-dir>')
  .description('Ingest Maestro test run results and auto-create bug tickets for failures')
  .option('--run-id <id>', 'Custom run ID (auto-generated if omitted)')
  .option('--device <device>', 'Device used for this run (e.g., "iphone", "pixel-7")')
  .action((outputDir: string, opts: { runId?: string; device?: string }) => {
    console.log(`\n  Ingesting results from: ${outputDir}\n`);
    try {
      const run = parseMaestroOutput(outputDir, opts.runId);

      // Tag results with device if provided
      if (opts.device) {
        for (const r of run.results) {
          r.device = opts.device;
        }
        run.devices = [opts.device];
      }

      // Write run log
      const runsDir = path.join(DATA_DIR, 'runs');
      fs.mkdirSync(runsDir, { recursive: true });
      const runFileName = `${run.id}.yaml`;
      const runContent = yaml.dump(run, { lineWidth: 120 });
      fs.writeFileSync(path.join(runsDir, runFileName), runContent, 'utf-8');

      console.log(`  ✓ Run ${run.id}: ${run.summary.passed}/${run.summary.total} passed, ${run.summary.failed} failed`);

      // Auto-create bug tickets for failures
      let bugsCreated = 0;
      const tests = loadAllTestCases();
      const bugsDir = path.join(DATA_DIR, 'bugs');

      for (const result of run.results) {
        if (result.status !== 'fail') continue;

        const test = tests.find(t => t.id === result.test);
        const bugId = nextBugId(bugsDir);

        // Copy screenshot
        let screenshotPath: string | undefined;
        if (result.screenshot && fs.existsSync(result.screenshot)) {
          const screenshotDir = path.join(DATA_DIR, 'screenshots', bugId.toLowerCase());
          fs.mkdirSync(screenshotDir, { recursive: true });
          const ext = path.extname(result.screenshot);
          const destFile = `failure-${opts.device ?? 'unknown'}${ext}`;
          fs.copyFileSync(result.screenshot, path.join(screenshotDir, destFile));
          screenshotPath = `screenshots/${bugId.toLowerCase()}/${destFile}`;
        }

        // Analyze selectors
        let selectorWarnings: Array<{ line: number; command: string; issue: string }> = [];
        if (test?.maestroFlow && fs.existsSync(test.maestroFlow)) {
          const yamlContent = fs.readFileSync(test.maestroFlow, 'utf-8');
          selectorWarnings = analyzeSelectors(yamlContent);
        }
        const bug: Bug = {
          id: bugId,
          title: `${result.test} failed${opts.device ? ` on ${opts.device}` : ''}`,
          status: 'open',
          priority: 'P2' as Priority,
          category: test?.category ?? 'unknown',
          linkedTest: result.test,
          device: opts.device ?? 'unknown',
          run: run.id,
          failureReason: result.failureReason ?? 'Test failed — see screenshot for details.',
          stepsToReproduce: test?.steps ?? '',
          selectorAnalysis: selectorWarnings,
          notes: '',
          screenshot: screenshotPath,
          thumbnail: screenshotPath,
          created: new Date().toISOString().split('T')[0],
          updated: new Date().toISOString().split('T')[0],
        };

        writeBug(bug, bugsDir);
        bugsCreated++;
        console.log(`  ✓ Created ${bugId}: ${bug.title}`);
      }

      if (bugsCreated > 0) {
        console.log(`\n  ${bugsCreated} bug ticket(s) created in ./data/bugs/`);
      }
      console.log(`\n  Run 'morbius serve' to view results.\n`);
    } catch (err) {
      console.error(`  ✗ Ingest failed: ${err}`);
      process.exit(1);
    }
  });

program
  .command('create-bug')
  .description('Manually create a bug ticket')
  .requiredOption('--test <test-id>', 'Linked test case ID (e.g., TC-2.01)')
  .requiredOption('--title <title>', 'Bug title')
  .option('--device <device>', 'Device where the bug was found', 'unknown')
  .option('--priority <priority>', 'Priority (P1, P2, P3, P4)', 'P2')
  .option('--reason <reason>', 'Failure reason')
  .option('--screenshot <path>', 'Path to failure screenshot')
  .action((opts) => {
    try {
      const tests = loadAllTestCases();
      const test = tests.find(t => t.id === opts.test);
      const bugsDir = path.join(DATA_DIR, 'bugs');

      const bugId = nextBugId(bugsDir);

      // Copy screenshot if provided
      let screenshotPath: string | undefined;
      if (opts.screenshot && fs.existsSync(opts.screenshot)) {
        const screenshotDir = path.join(DATA_DIR, 'screenshots', bugId.toLowerCase());
        fs.mkdirSync(screenshotDir, { recursive: true });
        const ext = path.extname(opts.screenshot);
        const destFile = `failure-${opts.device}${ext}`;
        fs.copyFileSync(opts.screenshot, path.join(screenshotDir, destFile));
        screenshotPath = `screenshots/${bugId.toLowerCase()}/${destFile}`;
      }

      const bug: Bug = {
        id: bugId,
        title: opts.title,
        status: 'open',
        priority: opts.priority as Priority,
        category: test?.category ?? 'unknown',
        linkedTest: opts.test,
        device: opts.device,
        failureReason: opts.reason ?? '',
        stepsToReproduce: test?.steps ?? '',
        selectorAnalysis: [],
        notes: '',
        screenshot: screenshotPath,
        thumbnail: screenshotPath,
        created: new Date().toISOString().split('T')[0],
        updated: new Date().toISOString().split('T')[0],
      };

      const filePath = writeBug(bug, bugsDir);
      console.log(`\n  ✓ Created ${bugId}: ${opts.title}`);
      console.log(`  File: ${filePath}\n`);
    } catch (err) {
      console.error(`  ✗ Failed: ${err}`);
      process.exit(1);
    }
  });

program
  .command('export <xlsx-path>')
  .description('Export dashboard changes back to the Excel file')
  .action((xlsxPath: string) => {
    console.log(`\n  Exporting to: ${xlsxPath}\n`);
    try {
      const tests = loadAllTestCases();
      const result = exportToExcel(xlsxPath, tests);
      console.log(`  ✓ ${result.sheetsUpdated} sheets updated`);
      console.log(`  ✓ ${result.cellsUpdated} cells written back`);
      console.log(`\n  Excel file updated: ${xlsxPath}\n`);
    } catch (err) {
      console.error(`  ✗ Export failed: ${err}`);
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Check data integrity — broken links, orphaned files, missing paths')
  .action(() => {
    const dataDir = getActiveDataDir();
    const registry = loadProjectRegistry();
    console.log(`\n  Validating project: ${registry.activeProject || 'default'}\n`);

    const tests = loadAllTestCases(dataDir);
    const bugs = loadAllBugs(dataDir);
    let issues = 0;

    // Check maestro_flow paths exist
    for (const test of tests) {
      if (test.maestroFlow && !fs.existsSync(test.maestroFlow)) {
        console.log(`  ✗ ${test.id}: Maestro flow path not found: ${test.maestroFlow}`);
        issues++;
      }
    }

    // Check bug linked tests exist
    const testIds = new Set(tests.map(t => t.id));
    for (const bug of bugs) {
      if (bug.linkedTest && !testIds.has(bug.linkedTest)) {
        console.log(`  ✗ ${bug.id}: Linked test ${bug.linkedTest} not found`);
        issues++;
      }
    }

    // Check bug screenshots exist
    for (const bug of bugs) {
      if (bug.screenshot) {
        const screenshotPath = path.join(dataDir, bug.screenshot);
        if (!fs.existsSync(screenshotPath)) {
          console.log(`  ✗ ${bug.id}: Screenshot not found: ${bug.screenshot}`);
          issues++;
        }
      }
    }

    // Check for empty categories
    const testsDir = path.join(dataDir, 'tests');
    if (fs.existsSync(testsDir)) {
      for (const cat of fs.readdirSync(testsDir, { withFileTypes: true })) {
        if (!cat.isDirectory()) continue;
        const catDir = path.join(testsDir, cat.name);
        const mdFiles = fs.readdirSync(catDir).filter(f => f.endsWith('.md'));
        if (mdFiles.length === 0) {
          console.log(`  ⚠ Category "${cat.name}" has no test cases`);
          issues++;
        }
      }
    }

    // Summary
    const happyPathCount = tests.filter(t => t.scenario === 'Happy Path' || t.scenario === 'Flow').length;
    const automatedCount = tests.filter(t => t.maestroFlow).length;

    console.log(`\n  Summary:`);
    console.log(`  ${tests.length} test cases, ${bugs.length} bugs`);
    console.log(`  ${automatedCount}/${happyPathCount} Happy Path/Flow tests have Maestro automation`);
    if (issues === 0) {
      console.log(`  ✓ No issues found\n`);
    } else {
      console.log(`  ✗ ${issues} issue(s) found\n`);
    }
  });

program
  .command('sync')
  .description('Sync Maestro YAML flows to test cases by matching QA Plan IDs')
  .option('--android <path>', 'Path to Android test flows')
  .option('--ios <path>', 'Path to iOS test flows')
  .action((opts) => {
    const dataDir = getActiveDataDir();
    const registry = loadProjectRegistry();
    const activeProject = registry.projects.find(p => p.id === registry.activeProject);

    // Determine Maestro paths from args, project config, or defaults
    const androidPath = opts.android ?? activeProject?.maestro?.androidPath;
    const iosPath = opts.ios ?? activeProject?.maestro?.iosPath;

    if (!androidPath && !iosPath) {
      console.error('  ✗ No Maestro paths found. Pass --android and/or --ios, or set them in the project config.');
      process.exit(1);
    }

    console.log(`\n  Syncing Maestro flows to test cases...\n`);

    // Scan YAML files and extract QA Plan IDs
    const flowMap = new Map<string, { android?: string; ios?: string }>();

    function scanFlows(dir: string, platform: 'android' | 'ios') {
      if (!dir || !fs.existsSync(dir)) return;
      const files = findYamlFiles(dir);
      for (const file of files) {
        try {
          const content = fs.readFileSync(file, 'utf-8');
          // Match "QA Plan ID: X.XX", "# ID: X.XX", or tag "tc-X.XX"
          const idMatch = content.match(/(?:QA Plan ID|# ID):\s*([\d.]+)/) ||
                          content.match(/- tc-([\d.]+)/);
          if (idMatch) {
            const tcId = `TC-${idMatch[1]}`;
            const existing = flowMap.get(tcId) ?? {};
            if (platform === 'android') existing.android = file;
            else existing.ios = file;
            flowMap.set(tcId, existing);
          }
        } catch { /* skip */ }
      }
    }

    if (androidPath) scanFlows(androidPath, 'android');
    if (iosPath) scanFlows(iosPath, 'ios');

    console.log(`  Found ${flowMap.size} flows with QA Plan IDs`);

    // Match to test case markdown files and update frontmatter
    const testsDir = path.join(dataDir, 'tests');
    if (!fs.existsSync(testsDir)) {
      console.error('  ✗ No test cases found. Run "morbius import" first.');
      process.exit(1);
    }

    let linked = 0;
    const categories = fs.readdirSync(testsDir, { withFileTypes: true }).filter(d => d.isDirectory());

    for (const cat of categories) {
      const catDir = path.join(testsDir, cat.name);
      const files = fs.readdirSync(catDir).filter(f => f.endsWith('.md'));

      for (const file of files) {
        const filePath = path.join(catDir, file);
        const raw = fs.readFileSync(filePath, 'utf-8');
        const { data, content } = matter(raw);
        const tcId = data.id as string;

        const flows = flowMap.get(tcId);
        if (!flows) continue;

        let changed = false;

        if (flows.android && data.maestro_flow_android !== flows.android) {
          data.maestro_flow_android = flows.android;
          changed = true;
        }
        if (flows.ios && data.maestro_flow_ios !== flows.ios) {
          data.maestro_flow_ios = flows.ios;
          changed = true;
        }
        // Also set maestro_flow to the android one for backward compat
        if (flows.android && data.maestro_flow !== flows.android) {
          data.maestro_flow = flows.android;
          changed = true;
        }
        // Mark as having automation
        if (!data.has_automation) {
          data.has_automation = true;
          changed = true;
        }

        if (changed) {
          data.updated = new Date().toISOString().split('T')[0];
          const updated = matter.stringify(content, data);
          fs.writeFileSync(filePath, updated, 'utf-8');
          linked++;
          const platforms = [flows.android ? 'Android' : '', flows.ios ? 'iOS' : ''].filter(Boolean).join(' + ');
          console.log(`  ✓ ${tcId} → ${platforms}`);
        }
      }
    }

    // Show summary
    const unlinked = flowMap.size - linked;
    console.log(`\n  ✓ ${linked} test cases linked to Maestro flows`);
    if (unlinked > 0) {
      console.log(`  ○ ${unlinked} flows could not be matched (QA Plan ID not found in test cases)`);
    }

    // Show test cases that DON'T have automation yet
    const allTests = loadAllTestCases(dataDir);
    const happyPathTests = allTests.filter(t => t.scenario === 'Happy Path' || t.scenario === 'Flow');
    const automatedCount = allTests.filter(t => t.maestroFlow).length;
    console.log(`\n  Coverage: ${automatedCount}/${happyPathTests.length} Happy Path/Flow tests have automation`);
    console.log(`  Run 'morbius serve' to see updated dashboard.\n`);
  });

program
  .command('ingest-media')
  .description('Copy latest Maestro run videos/screenshots into the project media folder')
  .option('--timestamp <ts>', 'Use a specific run timestamp (default: latest)')
  .action(async (opts) => {
    const registry = loadProjectRegistry();
    const activeProject = registry.projects.find(p => p.id === registry.activeProject);
    if (!activeProject) {
      console.error('No active project found.');
      process.exit(1);
    }
    const mediaPath = (activeProject as any).mediaPath as string | undefined;
    if (!mediaPath) {
      console.error(`Project "${activeProject.name}" has no mediaPath configured.`);
      console.error('Add "mediaPath" to data/projects.json for this project.');
      process.exit(1);
    }

    const maestroTestsDir = path.join(process.env.HOME || '', '.maestro', 'tests');
    if (!fs.existsSync(maestroTestsDir)) {
      console.error(`Maestro tests directory not found: ${maestroTestsDir}`);
      process.exit(1);
    }

    let timestamp = opts.timestamp as string | undefined;
    if (!timestamp) {
      const entries = fs.readdirSync(maestroTestsDir, { withFileTypes: true })
        .filter(e => e.isDirectory())
        .map(e => e.name)
        .sort()
        .reverse();
      if (entries.length === 0) {
        console.error('No Maestro test runs found.');
        process.exit(1);
      }
      timestamp = entries[0];
    }

    const srcDir = path.join(maestroTestsDir, timestamp);
    if (!fs.existsSync(srcDir)) {
      console.error(`Run directory not found: ${srcDir}`);
      process.exit(1);
    }

    const destRunDir = path.join(mediaPath, 'runs', timestamp);
    const destVideosDir = path.join(destRunDir, 'videos');
    const destScreenshotsDir = path.join(destRunDir, 'screenshots');
    fs.mkdirSync(destVideosDir, { recursive: true });
    fs.mkdirSync(destScreenshotsDir, { recursive: true });

    let videosCopied = 0;
    let screenshotsCopied = 0;

    function copyFilesFrom(dir: string, destVideoDir: string, destScreenDir: string) {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const src = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          copyFilesFrom(src, destVideoDir, destScreenDir);
        } else if (entry.name.endsWith('.mp4')) {
          fs.copyFileSync(src, path.join(destVideoDir, entry.name));
          videosCopied++;
        } else if (entry.name.endsWith('.png') || entry.name.endsWith('.jpg') || entry.name.endsWith('.jpeg')) {
          fs.copyFileSync(src, path.join(destScreenDir, entry.name));
          screenshotsCopied++;
        }
      }
    }

    copyFilesFrom(srcDir, destVideosDir, destScreenshotsDir);

    console.log(`\nIngest complete — run: ${timestamp}`);
    console.log(`  Videos:      ${videosCopied}`);
    console.log(`  Screenshots: ${screenshotsCopied}`);
    console.log(`  Destination: ${destRunDir}\n`);
  });

program
  .command('generate-flows')
  .description('Generate complete Maestro YAML flows from calculatorConfig.json')
  .option('--config <path>', 'Path to calculatorConfig.json')
  .option('--output <path>', 'Output directory for generated flows')
  .option('--calculator <id>', 'Generate for one calculator only (e.g. "oprisk")')
  .option('--platform <os>', 'ios or android', 'ios')
  .option('--app-id <id>', 'App bundle ID', 'com.sts.calculator.dev')
  .option('--login-flow <path>', 'Relative path to shared login.yaml', '../../shared/login.yaml')
  .option('--dry-run', 'Preview without writing files')
  .action((opts) => {
    const registry = loadProjectRegistry();
    const activeProject = registry.projects.find(p => p.id === registry.activeProject);

    // Resolve config path
    let configPath = opts.config;
    if (!configPath) {
      const codebasePath = (activeProject as any)?.codebasePath;
      if (codebasePath) {
        configPath = path.join(codebasePath, 'scripts', 'calculatorConfig.json');
      } else {
        console.error('No --config provided and no codebasePath in active project.');
        process.exit(1);
      }
    }
    if (!fs.existsSync(configPath)) {
      console.error(`Config not found: ${configPath}`);
      process.exit(1);
    }

    // Resolve output directory
    let outputDir = opts.output;
    if (!outputDir) {
      const maestroPaths = (activeProject as any)?.maestro;
      if (maestroPaths?.ios) {
        outputDir = path.join(path.dirname(maestroPaths.ios), 'generated');
      } else {
        outputDir = path.join(process.cwd(), 'generated-flows');
      }
    }

    console.log(`\n  Generating Maestro flows...`);
    console.log(`  Config:     ${configPath}`);
    console.log(`  Output:     ${outputDir}`);
    console.log(`  Platform:   ${opts.platform}`);
    if (opts.calculator) console.log(`  Calculator: ${opts.calculator}`);
    if (opts.dryRun) console.log(`  Mode:       DRY RUN`);
    console.log('');

    const result = generateFlows({
      configPath,
      outputDir,
      platform: opts.platform,
      appId: opts.appId,
      loginFlowPath: opts.loginFlow,
      calculatorId: opts.calculator,
      dryRun: opts.dryRun,
    });

    for (const entry of result.summary) {
      console.log(`  ✓ ${entry.calculator}`);
      console.log(`    ${entry.sections} section flows + 1 master | ${entry.fields} fields covered`);
    }

    console.log(`\n  Total: ${result.flows.length} flow files${opts.dryRun ? ' (dry run — nothing written)' : ' generated'}\n`);
  });

// E-023 / S-023-003: Pull QA plan from a PMAgent project into a Morbius project.
program
  .command('pmagent-sync <pmagent-slug>')
  .description('Transfer a PMAgent project’s QA plan into Morbius (pulls test cases from PMAgent’s QA tab)')
  .option('--target <morbiusProjectId>', 'Existing Morbius project id to update; default: derive from PMAgent brief.md or slug')
  .option('--path <pmagentPath>', 'Override PMAgent project folder path (otherwise resolves $PMAGENT_HOME/projects/<slug>)')
  .option('--force', 'Overwrite test cases even when checksums match (preserves history[] regardless)')
  .option('--dry-run', 'Preview only — show counts but do not write')
  .action(async (pmagentSlug: string, opts: { target?: string; path?: string; force?: boolean; dryRun?: boolean }) => {
    const port = process.env.MORBIUS_PORT || '9000';
    const url = `http://localhost:${port}/api/pmagent/${opts.dryRun ? 'preview' : 'transfer'}`;
    const body = JSON.stringify({
      pmagentSlug,
      pmagentPath: opts.path,
      morbiusProjectId: opts.target,
      force: !!opts.force,
    });
    console.log(`\n  PMAgent ${opts.dryRun ? 'preview' : 'transfer'}: ${pmagentSlug}`);
    try {
      const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      const j = await resp.json() as Record<string, unknown>;
      if (!resp.ok || j.ok !== true) {
        console.error(`  ✗ ${j.error ?? 'HTTP ' + resp.status}`);
        process.exit(1);
      }
      if (opts.dryRun) {
        const cats = (j.categories as Array<{ name: string; count: number }>) ?? [];
        console.log(`  ✓ ${j.totalTestCases ?? 0} test cases across ${cats.length} categories`);
        for (const c of cats) console.log(`    · ${c.name}: ${c.count}`);
        if (Array.isArray(j.skippedSheets) && j.skippedSheets.length > 0) {
          console.log(`  ○ ${(j.skippedSheets as string[]).join(', ')} skipped`);
        }
      } else {
        console.log(`  ✓ project: ${j.morbiusProjectId}`);
        console.log(`  ✓ ${j.testCasesCreated} created, ${j.testCasesUpdated} updated, ${j.testCasesUntouched} untouched${j.testCasesSkippedLocked ? ', ' + j.testCasesSkippedLocked + ' locked-skipped' : ''}`);
        console.log(`  ✓ ${j.durationMs}ms`);
      }
      console.log('');
    } catch (err) {
      console.error(`  ✗ ${err instanceof Error ? err.message : String(err)}`);
      console.error(`  Hint: is the Morbius server running on port ${port}? Try 'morbius serve --port ${port}' in another terminal.`);
      process.exit(1);
    }
  });

// E-023 (extension): publish Morbius test cases back as PMAgent T-*.md test plans
// so they appear in PMAgent's QA tab.
program
  .command('pmagent-publish <pmagent-slug>')
  .description('Generate T-NNN-NNN-*.md test plans in PMAgent epic folders from Morbius test cases')
  .option('--target <morbiusProjectId>', 'Morbius project id (default: linked project for this pmagent slug)')
  .option('--path <pmagentPath>', 'Override PMAgent project folder path')
  .option('--force', 'Rewrite test plan files even when content is unchanged')
  .action(async (pmagentSlug: string, opts: { target?: string; path?: string; force?: boolean }) => {
    const port = process.env.MORBIUS_PORT || '9000';
    const url = `http://localhost:${port}/api/pmagent/publish-test-plans`;
    const body = JSON.stringify({
      pmagentSlug,
      pmagentPath: opts.path,
      morbiusProjectId: opts.target,
      force: !!opts.force,
    });
    console.log(`\n  PMAgent publish-back: ${pmagentSlug}`);
    try {
      const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      const j = await resp.json() as Record<string, unknown>;
      if (!resp.ok || j.ok !== true) {
        console.error(`  ✗ ${j.error ?? 'HTTP ' + resp.status}`);
        process.exit(1);
      }
      console.log(`  ✓ ${j.testPlansWritten} test plan file(s) written, ${j.testPlansSkipped} unchanged`);
      console.log(`  ✓ from ${j.sourceTestCases} Morbius test cases (project: ${j.morbiusProjectId})`);
      const per = (j.perStory as Array<Record<string, unknown>>) ?? [];
      const created = per.filter(p => p.status === 'created');
      const updated = per.filter(p => p.status === 'updated');
      const unchanged = per.filter(p => p.status === 'unchanged');
      if (created.length > 0) console.log(`    · ${created.length} created`);
      if (updated.length > 0) console.log(`    · ${updated.length} updated`);
      if (unchanged.length > 0) console.log(`    · ${unchanged.length} unchanged`);
      console.log('');
    } catch (err) {
      console.error(`  ✗ ${err instanceof Error ? err.message : String(err)}`);
      console.error(`  Hint: is the Morbius server running on port ${port}?`);
      process.exit(1);
    }
  });

// E-024 / S-024-004: run a web test via the agent-orchestrated browser-MCP runner
program
  .command('run-web <testId>')
  .description('Run a web test case via Claude + Playwright MCP (E-024); --visual switches to Claude in Chrome')
  .option('--visual', 'Use the visual backend (Claude in Chrome) instead of headless Playwright')
  .action(async (testId: string, opts: { visual?: boolean }) => {
    const port = process.env.MORBIUS_PORT || '9000';
    const url = `http://localhost:${port}/api/test/run-web`;
    const mode = opts.visual ? 'visual' : 'headless';
    console.log(`\n  Running web test: ${testId} (${mode})`);
    try {
      const resp = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId, mode }),
      });
      const j = await resp.json() as Record<string, unknown>;
      if (!resp.ok || j.ok === false) {
        console.error(`  ✗ ${j.error ?? j.errorLine ?? 'HTTP ' + resp.status}`);
        process.exit(1);
      }
      console.log(`  ✓ ${j.status} · ${j.screenshotCount ?? 0} screenshots · ${Math.round((j.durationMs as number ?? 0)/1000)}s`);
      console.log(`  ✓ runId: ${j.runId} · target: ${j.targetUrl}`);
      if (j.errorLine) console.log(`  ! ${j.errorLine}`);
      console.log('');
    } catch (err) {
      console.error(`  ✗ ${err instanceof Error ? err.message : String(err)}`);
      console.error(`  Hint: is the Morbius server running on port ${port}?`);
      process.exit(1);
    }
  });

program.parse();

// Helper: recursively find all .yaml files
function findYamlFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findYamlFiles(fullPath));
    } else if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) {
      results.push(fullPath);
    }
  }
  return results;
}
