import fs from 'node:fs';
import yaml from 'js-yaml';
import type { MaestroFlow, MaestroStep, SelectorWarning } from '../types.js';

export function parseMaestroYaml(filePath: string): MaestroFlow {
  const raw = fs.readFileSync(filePath, 'utf-8');

  // Split on YAML document separator to get frontmatter and steps
  const parts = raw.split(/^---$/m);
  let frontmatterStr = '';
  let stepsStr = '';

  if (parts.length >= 3) {
    // Has explicit frontmatter: empty + frontmatter + steps
    frontmatterStr = parts[1];
    stepsStr = parts.slice(2).join('---');
  } else if (parts.length === 2) {
    frontmatterStr = parts[0];
    stepsStr = parts[1];
  } else {
    stepsStr = raw;
  }

  // Parse frontmatter
  let meta: Record<string, unknown> = {};
  try {
    meta = (yaml.load(frontmatterStr) as Record<string, unknown>) ?? {};
  } catch { /* ignore parse errors in frontmatter */ }

  // Parse steps
  let rawSteps: unknown[] = [];
  try {
    const parsed = yaml.load(stepsStr);
    if (Array.isArray(parsed)) {
      rawSteps = parsed;
    }
  } catch { /* ignore parse errors in steps */ }

  // Extract QA Plan ID from comments (supports "QA Plan ID: X.XX" and "# ID: X.XX")
  const qaPlanIdMatch = raw.match(/(?:QA Plan ID|# ID):\s*([\d.]+)/);

  // Track line numbers for selector warnings
  const lines = raw.split('\n');
  const selectorWarnings = findFragileSelectors(lines);
  const referencedFlows = findReferencedFlows(rawSteps);
  const steps = rawSteps.map((step, idx) => parseStep(step, idx));

  return {
    appId: String(meta.appId ?? ''),
    name: String(meta.name ?? ''),
    qaPlanId: qaPlanIdMatch?.[1] ?? null,
    tags: Array.isArray(meta.tags) ? meta.tags.map(String) : [],
    envVars: (meta.env as Record<string, string>) ?? {},
    steps,
    referencedFlows,
    selectorWarnings,
  };
}

function parseStep(step: unknown, _index: number): MaestroStep {
  if (typeof step === 'string') {
    return simpleStep(step, step);
  }

  if (typeof step !== 'object' || step === null) {
    return simpleStep('unknown', String(step));
  }

  const obj = step as Record<string, unknown>;
  const key = Object.keys(obj)[0];
  const value = obj[key];

  if (!key) return simpleStep('unknown', JSON.stringify(step));

  return translateCommand(key, value);
}

function translateCommand(key: string, value: unknown): MaestroStep {
  switch (key) {
    case 'tapOn': {
      if (typeof value === 'string') {
        return simpleStep('tapOn', `Tap on "${cleanSelector(value)}"`);
      }
      if (typeof value === 'object' && value !== null) {
        const v = value as Record<string, unknown>;
        if (v.point) return fragileStep('tapOn', `Tap at pixel position ${v.point}`, String(v.point));
        if (v.text) return simpleStep('tapOn', `Tap on "${v.text}"`);
        if (v.id) return simpleStep('tapOn', `Tap on element with ID "${v.id}"`);
      }
      return simpleStep('tapOn', `Tap on ${JSON.stringify(value)}`);
    }

    case 'assertVisible': {
      const target = typeof value === 'string' ? value : JSON.stringify(value);
      return simpleStep('assertVisible', `Verify "${cleanSelector(target)}" is visible`);
    }

    case 'assertNotVisible': {
      const target = typeof value === 'string' ? value : JSON.stringify(value);
      return simpleStep('assertNotVisible', `Verify "${cleanSelector(target)}" is NOT visible`);
    }

    case 'inputText': {
      const text = String(value);
      const display = text.startsWith('${') ? text.replace(/\$\{(.+?)\}/g, (_, v) => formatEnvVar(v)) : `"${text}"`;
      return simpleStep('inputText', `Enter text: ${display}`);
    }

    case 'eraseText': {
      return simpleStep('eraseText', `Clear text field (${value} characters)`);
    }

    case 'hideKeyboard': {
      return simpleStep('hideKeyboard', 'Dismiss keyboard');
    }

    case 'scrollUntilVisible': {
      const v = value as Record<string, unknown>;
      const dir = String(v?.direction ?? 'DOWN').toLowerCase();
      const element = String(v?.element ?? '');
      return simpleStep('scrollUntilVisible', `Scroll ${dir} until "${cleanSelector(element)}" is visible`);
    }

    case 'scroll': {
      return simpleStep('scroll', 'Scroll the screen');
    }

    case 'swipe': {
      const v = value as Record<string, unknown>;
      return simpleStep('swipe', `Swipe ${String(v?.direction ?? '').toLowerCase()}`);
    }

    case 'extendedWaitUntil': {
      const v = value as Record<string, unknown>;
      const timeout = v?.timeout ? ` (up to ${Number(v.timeout) / 1000}s)` : '';
      if (v?.visible) {
        return simpleStep('extendedWaitUntil', `Wait for "${cleanSelector(String(v.visible))}" to appear${timeout}`);
      }
      return simpleStep('extendedWaitUntil', `Wait for condition${timeout}`);
    }

    case 'waitForAnimationToEnd': {
      return simpleStep('waitForAnimationToEnd', 'Wait for animation to finish');
    }

    case 'runFlow': {
      if (typeof value === 'string') {
        return simpleStep('runFlow', `Run flow: ${flowName(value)}`);
      }
      const v = value as Record<string, unknown>;
      if (v?.file) {
        return simpleStep('runFlow', `Run shared flow: ${flowName(String(v.file))}`);
      }
      if (v?.when) {
        const when = v.when as Record<string, unknown>;
        const condition = when.visible ? `"${cleanSelector(String(when.visible))}" is visible` : 'condition met';
        const children = Array.isArray(v.commands)
          ? (v.commands as unknown[]).map((c, i) => parseStep(c, i))
          : [];
        return {
          action: 'runFlow',
          humanReadable: `If ${condition}, then:`,
          condition,
          children,
        };
      }
      return simpleStep('runFlow', `Run flow: ${JSON.stringify(value)}`);
    }

    case 'launchApp': {
      if (typeof value === 'object' && value !== null) {
        const v = value as Record<string, unknown>;
        return simpleStep('launchApp', `Launch app: ${v.appId ?? 'default'}`);
      }
      return simpleStep('launchApp', 'Launch the app');
    }

    case 'stopApp': {
      return simpleStep('stopApp', 'Stop the app');
    }

    case 'clearState': {
      return simpleStep('clearState', 'Clear app data');
    }

    case 'clearKeychain': {
      return simpleStep('clearKeychain', 'Clear device keychain');
    }

    case 'back': {
      return simpleStep('back', 'Press the back button');
    }

    case 'repeat': {
      const v = value as Record<string, unknown>;
      const whileCondition = v?.while as Record<string, unknown> | undefined;
      const times = v?.times;
      const children = Array.isArray(v?.commands)
        ? (v.commands as unknown[]).map((c, i) => parseStep(c, i))
        : [];

      let desc = 'Repeat';
      if (whileCondition?.visible) {
        desc = `Repeat while "${cleanSelector(String(whileCondition.visible))}" is visible`;
      } else if (times) {
        desc = `Repeat ${times} times`;
      }

      return { action: 'repeat', humanReadable: desc, children };
    }

    case 'takeScreenshot': {
      return simpleStep('takeScreenshot', `Take screenshot: ${value ?? 'current state'}`);
    }

    case 'assertTrue': {
      return simpleStep('assertTrue', `Assert condition is true`);
    }

    default: {
      return simpleStep(key, `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`);
    }
  }
}

function simpleStep(action: string, humanReadable: string): MaestroStep {
  return { action, humanReadable };
}

function fragileStep(action: string, humanReadable: string, target: string): MaestroStep {
  return { action, humanReadable, target };
}

function cleanSelector(value: string): string {
  // Maestro uses "|" for OR selectors — show the first option
  if (value.includes('|')) {
    return value.split('|')[0].trim();
  }
  // Replace env vars with readable names
  return value.replace(/\$\{(.+?)\}/g, (_, v) => `[${formatEnvVar(v)}]`);
}

function formatEnvVar(varName: string): string {
  return varName
    .replace(/^TEST_/, '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function flowName(filePath: string): string {
  const base = filePath.split('/').pop() ?? filePath;
  return base
    .replace(/\.yaml$/, '')
    .replace(/_/g, ' ')
    .replace(/^(android|ios)\s+/i, '')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function findReferencedFlows(steps: unknown[]): string[] {
  const flows: string[] = [];
  for (const step of steps) {
    if (typeof step !== 'object' || step === null) continue;
    const obj = step as Record<string, unknown>;
    if (obj.runFlow) {
      const v = obj.runFlow;
      if (typeof v === 'string') flows.push(v);
      else if (typeof v === 'object' && v !== null) {
        const file = (v as Record<string, unknown>).file;
        if (typeof file === 'string') flows.push(file);
      }
    }
  }
  return flows;
}

function findFragileSelectors(lines: string[]): SelectorWarning[] {
  const warnings: SelectorWarning[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Detect pixel-based selectors
    if (/point:\s*["']?\d+,\s*\d+/.test(line)) {
      warnings.push({
        line: i + 1,
        command: line.trim(),
        issue: 'Pixel-based selector — fragile across devices and OS versions',
      });
    }
    // Detect hardcoded sleeps
    if (/sleep:\s*\d{4,}/.test(line)) {
      warnings.push({
        line: i + 1,
        command: line.trim(),
        issue: 'Long hardcoded sleep — may cause flakiness',
      });
    }
  }
  return warnings;
}

export function stepsToHtml(steps: MaestroStep[], indent: number = 0): string {
  const pad = '  '.repeat(indent);
  let html = `${pad}<ol class="maestro-steps">\n`;

  for (const step of steps) {
    const statusClass = step.action === 'assertVisible' || step.action === 'assertTrue'
      ? 'step-verify'
      : step.action === 'runFlow'
      ? 'step-flow'
      : 'step-action';

    html += `${pad}  <li class="${statusClass}">${escapeHtml(step.humanReadable)}`;

    if (step.children && step.children.length > 0) {
      html += '\n' + stepsToHtml(step.children, indent + 2);
      html += `${pad}  `;
    }

    html += `</li>\n`;
  }

  html += `${pad}</ol>\n`;
  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
