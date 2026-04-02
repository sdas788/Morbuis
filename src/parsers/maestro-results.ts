import fs from 'node:fs';
import path from 'node:path';
import type { TestRun, RunResult, RunSummary, TestStatus } from '../types.js';

/**
 * Parse Maestro CLI test output directory.
 * Maestro writes results to a directory structure like:
 *   .maestro-test-output/
 *     <flow-name>/
 *       commands.json    — executed commands with status
 *       screenshots/     — failure screenshots
 */
export function parseMaestroOutput(outputDir: string, runId?: string): TestRun {
  const absoluteDir = path.resolve(outputDir);
  if (!fs.existsSync(absoluteDir)) {
    throw new Error(`Maestro output directory not found: ${absoluteDir}`);
  }

  const id = runId ?? generateRunId();
  const timestamp = new Date().toISOString();
  const results: RunResult[] = [];
  const devices = new Set<string>();

  // Scan for flow result directories
  const entries = fs.readdirSync(absoluteDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const flowDir = path.join(absoluteDir, entry.name);
    const result = parseFlowResult(flowDir, entry.name);
    if (result) {
      results.push(result);
      if (result.device) devices.add(result.device);
    }
  }

  // Also check for a top-level report.xml (JUnit format) that Maestro sometimes generates
  const reportPath = path.join(absoluteDir, 'report.xml');
  if (fs.existsSync(reportPath) && results.length === 0) {
    const xmlResults = parseJUnitReport(reportPath);
    results.push(...xmlResults);
  }

  // Check for Maestro's JSON output format
  const jsonReportPath = path.join(absoluteDir, 'report.json');
  if (fs.existsSync(jsonReportPath) && results.length === 0) {
    const jsonResults = parseJsonReport(jsonReportPath);
    results.push(...jsonResults);
  }

  const summary = computeSummary(results);

  return {
    id,
    timestamp,
    devices: Array.from(devices),
    results,
    summary,
  };
}

function parseFlowResult(flowDir: string, flowName: string): RunResult | null {
  // Look for commands.json
  const commandsPath = path.join(flowDir, 'commands.json');
  const statusPath = path.join(flowDir, 'status.json');

  let status: TestStatus = 'not-run';
  let failureReason: string | undefined;
  let durationMs: number | undefined;
  let screenshot: string | undefined;

  // Try status.json first
  if (fs.existsSync(statusPath)) {
    try {
      const statusData = JSON.parse(fs.readFileSync(statusPath, 'utf-8'));
      status = mapMaestroStatus(statusData.status ?? statusData.result);
      failureReason = statusData.error ?? statusData.failureMessage;
      durationMs = statusData.durationMs ?? statusData.duration;
    } catch { /* skip */ }
  }

  // Try commands.json for more detail
  if (fs.existsSync(commandsPath)) {
    try {
      const commands = JSON.parse(fs.readFileSync(commandsPath, 'utf-8'));
      if (Array.isArray(commands)) {
        const failed = commands.find((c: Record<string, unknown>) =>
          c.status === 'FAILED' || c.status === 'ERROR'
        );
        if (failed) {
          status = 'fail';
          failureReason = failureReason ?? String(failed.error ?? failed.message ?? '');
        } else if (commands.every((c: Record<string, unknown>) => c.status === 'COMPLETED')) {
          status = 'pass';
        }
        // Sum durations
        durationMs = commands.reduce((sum: number, c: Record<string, unknown>) =>
          sum + (Number(c.durationMs ?? c.duration ?? 0)), 0);
      }
    } catch { /* skip */ }
  }

  // If we couldn't determine status from JSON, check for failure indicators
  if (status === 'not-run') {
    const hasScreenshots = fs.existsSync(path.join(flowDir, 'screenshots'));
    if (hasScreenshots) {
      // If there are screenshots, something ran
      const screenshotFiles = fs.readdirSync(path.join(flowDir, 'screenshots'));
      const failureScreenshot = screenshotFiles.find(f => f.includes('fail') || f.includes('error'));
      if (failureScreenshot) {
        status = 'fail';
        screenshot = path.join(flowDir, 'screenshots', failureScreenshot);
      } else if (screenshotFiles.length > 0) {
        status = 'pass';
      }
    }
  }

  // Find failure screenshot
  const screenshotsDir = path.join(flowDir, 'screenshots');
  if (fs.existsSync(screenshotsDir)) {
    const files = fs.readdirSync(screenshotsDir).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
    if (files.length > 0) {
      // Last screenshot is typically the failure state
      screenshot = path.join(screenshotsDir, files[files.length - 1]);
    }
  }

  // Extract test case ID from flow name
  const testId = extractTestId(flowName);

  if (status === 'not-run' && !failureReason) return null;

  return {
    test: testId ?? flowName,
    status,
    durationMs,
    failureReason,
    screenshot,
  };
}

function parseJUnitReport(reportPath: string): RunResult[] {
  const results: RunResult[] = [];
  try {
    const xml = fs.readFileSync(reportPath, 'utf-8');

    // Simple XML parsing for JUnit format
    const testCaseRegex = /<testcase\s+name="([^"]+)"[^>]*time="([^"]*)"[^>]*>([\s\S]*?)<\/testcase>/g;
    let match;

    while ((match = testCaseRegex.exec(xml)) !== null) {
      const name = match[1];
      const duration = parseFloat(match[2]) * 1000; // seconds to ms
      const body = match[3];

      const isFailed = body.includes('<failure') || body.includes('<error');
      const failureMatch = body.match(/message="([^"]*)"/);

      results.push({
        test: extractTestId(name) ?? name,
        status: isFailed ? 'fail' : 'pass',
        durationMs: isNaN(duration) ? undefined : Math.round(duration),
        failureReason: isFailed ? (failureMatch?.[1] ?? 'Test failed') : undefined,
      });
    }
  } catch { /* skip */ }
  return results;
}

function parseJsonReport(reportPath: string): RunResult[] {
  const results: RunResult[] = [];
  try {
    const data = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
    const flows = data.flows ?? data.results ?? data.testCases ?? [];

    for (const flow of flows) {
      if (typeof flow !== 'object') continue;
      const name = flow.name ?? flow.flowName ?? flow.testName ?? '';
      const flowStatus = flow.status ?? flow.result ?? '';

      results.push({
        test: extractTestId(name) ?? name,
        status: mapMaestroStatus(flowStatus),
        durationMs: flow.durationMs ?? flow.duration,
        failureReason: flow.error ?? flow.failureMessage ?? flow.failureReason,
        screenshot: flow.screenshot ?? flow.screenshotPath,
      });
    }
  } catch { /* skip */ }
  return results;
}

function mapMaestroStatus(status: unknown): TestStatus {
  const s = String(status ?? '').toUpperCase();
  if (s === 'SUCCESS' || s === 'PASSED' || s === 'COMPLETED' || s === 'PASS') return 'pass';
  if (s === 'FAILED' || s === 'ERROR' || s === 'FAILURE' || s === 'FAIL') return 'fail';
  if (s === 'SKIPPED' || s === 'PENDING') return 'not-run';
  return 'not-run';
}

function extractTestId(flowName: string): string | null {
  // Try to extract QA Plan ID from flow name
  // Patterns: "rename_hub_happy_flow" → look for QA ID in comment
  // Or "1.01" or "TC-1.01" embedded in name
  const idMatch = flowName.match(/(?:TC[- ]?)?(\d+\.\d+)/i);
  if (idMatch) {
    return `TC-${idMatch[1]}`;
  }
  return null;
}

function generateRunId(): string {
  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `run-${dateStr}`;
}

function computeSummary(results: RunResult[]): RunSummary {
  return {
    total: results.length,
    passed: results.filter(r => r.status === 'pass').length,
    failed: results.filter(r => r.status === 'fail').length,
    flaky: results.filter(r => r.status === 'flaky').length,
    notRun: results.filter(r => r.status === 'not-run').length,
  };
}
