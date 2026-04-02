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

const DATA_DIR = path.join(process.cwd(), 'data');

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
