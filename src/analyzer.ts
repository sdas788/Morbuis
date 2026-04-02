import fs from 'node:fs';
import type {
  TestCase, Bug, TestRun, TestStatus, SelectorWarning,
  FlakyTest, CategoryHealth, Category, DashboardData, DeviceCoverage,
  ActivityItem,
} from './types.js';

// ============================================================
// Flaky Test Detection
// ============================================================

/**
 * Calculate flakiness score for a test based on its run history.
 * Score = (number of status transitions) / (runs - 1)
 * A test that alternates P-F-P-F has score 1.0 (max flaky).
 * A test that goes P-P-P-F has score 0.25 (minor).
 */
export function calculateFlakiness(history: TestStatus[], window: number = 10): number {
  const recent = history.slice(0, window);
  if (recent.length < 2) return 0;

  let transitions = 0;
  for (let i = 1; i < recent.length; i++) {
    if (recent[i] !== recent[i - 1]) transitions++;
  }

  return transitions / (recent.length - 1);
}

export function detectFlakyTests(
  tests: TestCase[],
  runs: TestRun[],
  window: number = 10,
  threshold: number = 0.4,
): FlakyTest[] {
  const flakyTests: FlakyTest[] = [];

  for (const test of tests) {
    // Build history from runs (most recent first)
    const history: TestStatus[] = [];
    for (const run of runs) {
      const result = run.results.find(r => r.test === test.id);
      if (result) history.push(result.status);
    }

    // Also use inline history from test case
    if (history.length === 0 && test.history.length > 0) {
      for (const h of test.history) {
        history.push(h.status);
      }
    }

    if (history.length < 2) continue;

    const score = calculateFlakiness(history, window);
    if (score >= threshold) {
      flakyTests.push({
        testId: test.id,
        testTitle: test.title,
        category: test.category,
        score,
        recentResults: history.slice(0, window),
      });
    }
  }

  return flakyTests.sort((a, b) => b.score - a.score);
}

// ============================================================
// Fragile Selector Detection
// ============================================================

/**
 * Scan a Maestro YAML file for fragile selectors.
 * Flags: pixel-based point selectors, hardcoded sleeps, missing appId.
 */
export function analyzeSelectors(yamlContent: string): SelectorWarning[] {
  const warnings: SelectorWarning[] = [];
  const lines = yamlContent.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Pixel-based tap selectors
    if (/point:\s*["']?\d+\s*,\s*\d+/.test(line)) {
      warnings.push({
        line: lineNum,
        command: line.trim(),
        issue: 'Pixel-based selector — fragile across devices and OS versions. Use text or accessibility ID instead.',
      });
    }

    // Hardcoded long sleeps (>3 seconds)
    const sleepMatch = line.match(/sleep:\s*(\d+)/);
    if (sleepMatch && parseInt(sleepMatch[1], 10) > 3000) {
      warnings.push({
        line: lineNum,
        command: line.trim(),
        issue: `Hardcoded sleep of ${parseInt(sleepMatch[1], 10) / 1000}s — may cause flakiness. Use extendedWaitUntil instead.`,
      });
    }

    // Index-based selectors (fragile if UI order changes)
    if (/index:\s*\d+/.test(line) && !/index:\s*0/.test(line)) {
      warnings.push({
        line: lineNum,
        command: line.trim(),
        issue: 'Index-based selector — fragile if UI element order changes. Prefer text or ID selectors.',
      });
    }
  }

  return warnings;
}

/**
 * Check all test cases for fragile selectors in their linked Maestro YAML.
 */
export function findFragileTests(tests: TestCase[]): Array<{ testId: string; warnings: SelectorWarning[] }> {
  const results: Array<{ testId: string; warnings: SelectorWarning[] }> = [];

  for (const test of tests) {
    if (!test.maestroFlow || !fs.existsSync(test.maestroFlow)) continue;

    try {
      const yaml = fs.readFileSync(test.maestroFlow, 'utf-8');
      const warnings = analyzeSelectors(yaml);
      if (warnings.length > 0) {
        results.push({ testId: test.id, warnings });
      }
    } catch { /* skip */ }
  }

  return results;
}

// ============================================================
// Health Calculations
// ============================================================

export function calculateCategoryHealth(
  categories: Category[],
  tests: TestCase[],
): CategoryHealth[] {
  return categories.map(cat => {
    const catTests = tests.filter(t => t.category === cat.id);
    const passed = catTests.filter(t => t.status === 'pass').length;
    const failed = catTests.filter(t => t.status === 'fail').length;
    const flaky = catTests.filter(t => t.status === 'flaky').length;
    const notRun = catTests.filter(t => t.status === 'not-run').length;
    return {
      category: cat,
      total: catTests.length,
      passed, failed, flaky, notRun,
      percentage: catTests.length > 0 ? Math.round((passed / catTests.length) * 100) : 0,
    };
  });
}

export function calculateDeviceCoverage(
  tests: TestCase[],
  deviceIds: string[],
): DeviceCoverage[] {
  return deviceIds.map(deviceId => {
    const device = { id: deviceId, name: deviceId, platform: 'ios' as const };
    const withDevice = tests.filter(t => t.deviceResults.some(dr => dr.device === deviceId));
    const passedOnDevice = withDevice.filter(t =>
      t.deviceResults.find(dr => dr.device === deviceId)?.status === 'pass'
    ).length;
    return {
      device,
      total: withDevice.length,
      passed: passedOnDevice,
      percentage: withDevice.length > 0 ? Math.round((passedOnDevice / withDevice.length) * 100) : 0,
    };
  });
}

// ============================================================
// Coverage Gap Detection
// ============================================================

export function findCoverageGaps(
  tests: TestCase[],
  categories: Category[],
  deviceIds: string[],
  staleThresholdDays: number = 7,
): string[] {
  const gaps: string[] = [];
  const now = Date.now();
  const staleMs = staleThresholdDays * 24 * 60 * 60 * 1000;

  // Categories with low test count
  for (const cat of categories) {
    const catTests = tests.filter(t => t.category === cat.id);
    if (catTests.length === 0) {
      gaps.push(`${cat.name} has no test cases`);
    }
  }

  // Tests never run
  const neverRun = tests.filter(t => t.status === 'not-run' && t.deviceResults.length === 0);
  if (neverRun.length > 0) {
    gaps.push(`${neverRun.length} test(s) have never been executed`);
  }

  // Tests not run recently (stale)
  const staleTests = tests.filter(t => {
    if (t.status === 'not-run') return false; // already counted above
    const lastUpdate = new Date(t.updated).getTime();
    return (now - lastUpdate) > staleMs;
  });
  if (staleTests.length > 0) {
    gaps.push(`${staleTests.length} test(s) not run in ${staleThresholdDays}+ days`);
  }

  // Devices with low coverage
  for (const deviceId of deviceIds) {
    const testsOnDevice = tests.filter(t => t.deviceResults.some(dr => dr.device === deviceId));
    const coverage = tests.length > 0 ? Math.round((testsOnDevice.length / tests.length) * 100) : 0;
    if (coverage < 50) {
      gaps.push(`${deviceId} is missing ${100 - coverage}% of test coverage`);
    }
  }

  return gaps;
}

// ============================================================
// Activity Feed
// ============================================================

export function buildActivityFeed(
  bugs: Bug[],
  runs: TestRun[],
  limit: number = 20,
): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const bug of bugs) {
    items.push({
      type: 'bug_opened',
      title: bug.title,
      id: bug.id,
      timestamp: bug.created,
    });
  }

  for (const run of runs) {
    items.push({
      type: 'run_completed',
      title: `${run.summary.passed}/${run.summary.total} passed`,
      id: run.id,
      timestamp: run.timestamp,
    });

    // Add individual failures
    for (const result of run.results) {
      if (result.status === 'fail') {
        items.push({
          type: 'test_failed',
          title: `${result.test} failed${result.device ? ` on ${result.device}` : ''}`,
          id: result.test,
          timestamp: run.timestamp,
        });
      }
    }
  }

  return items
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);
}
