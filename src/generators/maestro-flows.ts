/**
 * Maestro YAML flow generator.
 * Reads calculatorConfig.json and produces complete E2E flows
 * with testID-based selectors for every field in every calculator.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  type FieldConfig,
  getNumericTestValue,
  getSingleSelectValue,
  getMultiSelectValue,
  getCheckboxGroupValue,
} from './test-data.js';
import {
  type CalculatorConfig,
  type SectionConfig,
  type SubsectionConfig,
  buildDependencyTriggers,
  buildApiKeyToFieldMap,
  topologicalSortFields,
} from './dependency-graph.js';

export interface GeneratorOptions {
  configPath: string;
  outputDir: string;
  platform: 'ios' | 'android';
  appId: string;
  loginFlowPath: string;
  calculatorId?: string; // generate only one
  dryRun?: boolean;
}

interface GeneratedFlow {
  path: string;
  content: string;
  fieldCount: number;
}

// ─── YAML helpers ───────────────────────────────────────────────

function yamlHeader(name: string, appId: string, tags: string[]): string {
  return `appId: ${appId}
name: "${name}"
tags:
${tags.map(t => `  - ${t}`).join('\n')}
---`;
}

function indent(lines: string[], level = 0): string {
  const prefix = '  '.repeat(level);
  return lines.map(l => prefix + l).join('\n');
}

// ─── Step generators per field type ─────────────────────────────

function scrollAndTap(testId: string, comment?: string): string[] {
  const lines: string[] = [];
  if (comment) lines.push(`# ${comment}`);
  lines.push(
    `- scrollUntilVisible:`,
    `    element:`,
    `      id: "${testId}"`,
    `    direction: DOWN`,
    `    timeout: 15000`,
    `- tapOn:`,
    `    id: "${testId}"`,
  );
  return lines;
}

function stepsForCheckbox(field: FieldConfig): string[] {
  return scrollAndTap(`checkbox-${field.id}`, `${field.name} (checkbox)`);
}

function stepsForSingleSelect(
  field: FieldConfig,
  triggers: Map<string, Map<string, number>>,
): string[] {
  const value = getSingleSelectValue(field, triggers);
  const option = field.options?.find(o => String(o.value) === value);
  const label = option?.label || value;
  return scrollAndTap(
    `radio-${field.id}-${value}`,
    `${field.name}: ${label} (singleSelect)`,
  );
}

function stepsForSingleSelectMultiAttribute(field: FieldConfig): string[] {
  // Each option is a separate radio group — tap the first non-disabled
  const lines: string[] = [];
  const options = field.options || [];
  const valid = options.find(
    o => !o.disabled && o.exclusionCriteria !== 'true' && !o.default,
  );
  const option = valid || options[0];
  if (!option) return [];
  lines.push(`# ${field.name}: ${option.label} (singleSelectMultiAttribute)`);
  const testId = `radio-${field.id}-${option.label}-${
    option.apiKeys
      ? option.apiKeys.map((k: any) => k.value).sort().join(',')
      : option.value
  }`;
  lines.push(
    `- scrollUntilVisible:`,
    `    element:`,
    `      id: "${testId}"`,
    `    direction: DOWN`,
    `    timeout: 15000`,
    `- tapOn:`,
    `    id: "${testId}"`,
  );
  return lines;
}

function stepsForInteger(field: FieldConfig): string[] {
  const value = getNumericTestValue(field);
  const lines: string[] = [];
  lines.push(`# ${field.name}: ${value} (integer)`);
  lines.push(
    `- scrollUntilVisible:`,
    `    element:`,
    `      id: "input-${field.id}"`,
    `    direction: DOWN`,
    `    timeout: 15000`,
    `- tapOn:`,
    `    id: "input-${field.id}"`,
    `- inputText: "${value}"`,
    `- hideKeyboard`,
  );
  return lines;
}

function stepsForDecimal(field: FieldConfig): string[] {
  const value = getNumericTestValue(field);
  const lines: string[] = [];
  lines.push(`# ${field.name}: ${value} (decimal)`);
  lines.push(
    `- scrollUntilVisible:`,
    `    element:`,
    `      id: "input-${field.id}"`,
    `    direction: DOWN`,
    `    timeout: 15000`,
    `- tapOn:`,
    `    id: "input-${field.id}"`,
    `- inputText: "${value}"`,
    `- hideKeyboard`,
  );
  return lines;
}

function stepsForMultiSelect(field: FieldConfig): string[] {
  const value = getMultiSelectValue(field);
  const option = field.options?.find(o => String(o.value) === value);
  const label = option?.label || value;
  return scrollAndTap(
    `chip-${field.id}-${value}`,
    `${field.name}: ${label} (multiSelect)`,
  );
}

function stepsForMultiSelectMultiAttribute(field: FieldConfig): string[] {
  const value = getMultiSelectValue(field);
  const option = field.options?.find(o => String(o.value) === value);
  const label = option?.label || value;
  return scrollAndTap(
    `chip-${field.id}-${value}`,
    `${field.name}: ${label} (multiSelectMultiAttribute)`,
  );
}

function stepsForCheckboxGroup(field: FieldConfig): string[] {
  const value = getCheckboxGroupValue(field);
  const option = field.options?.find(o => String(o.value) === value);
  const label = option?.label || value;
  return scrollAndTap(
    `chip-${field.id}-${value}`,
    `${field.name}: ${label} (checkboxGroup)`,
  );
}

// ─── Generate steps for one field ───────────────────────────────

function stepsForField(
  field: FieldConfig,
  triggers: Map<string, Map<string, number>>,
  isConditional: boolean,
): string[] {
  // Skip non-interactive types
  if (field.type === 'infoText') return [];
  if (field.disabled) return [];

  let steps: string[];
  switch (field.type) {
    case 'checkbox':
      steps = stepsForCheckbox(field);
      break;
    case 'singleSelect':
      steps = stepsForSingleSelect(field, triggers);
      break;
    case 'singleSelectMultiAttribute':
      steps = stepsForSingleSelectMultiAttribute(field);
      break;
    case 'integer':
      steps = stepsForInteger(field);
      break;
    case 'decimal':
      steps = stepsForDecimal(field);
      break;
    case 'multiSelect':
      steps = stepsForMultiSelect(field);
      break;
    case 'multiSelectMultiAttribute':
      steps = stepsForMultiSelectMultiAttribute(field);
      break;
    case 'checkboxGroup':
      steps = stepsForCheckboxGroup(field);
      break;
    case 'customTumorSize':
      steps = [`# ${field.name}: CUSTOM — requires manual tumor size input (skipped)`];
      break;
    default:
      steps = [`# ${field.name}: unknown type "${field.type}" (skipped)`];
      break;
  }

  // Conditional fields: use runFlow when: visible with tapOn only (no inner scroll)
  // The field should be near the current viewport since we fill in form order
  if (isConditional && steps.length > 0) {
    const firstTestId = getFieldPrimaryTestId(field);
    if (firstTestId) {
      const comment = steps.find(l => l.startsWith('#')) || '';
      // Simple approach: scroll to find it (may already be visible), tap, both optional
      return [
        comment ? comment + ' (conditional)' : '',
        `- scrollUntilVisible:`,
        `    element:`,
        `      id: "${firstTestId}"`,
        `    direction: DOWN`,
        `    timeout: 5000`,
        `    optional: true`,
        `- tapOn:`,
        `    id: "${firstTestId}"`,
        `    optional: true`,
        ...(field.type === 'integer' || field.type === 'decimal'
          ? [`- inputText: "${getNumericTestValue(field)}"`, `- hideKeyboard`]
          : []),
      ].filter(l => l !== '');
    }
  }

  return steps;
}

function getFieldPrimaryTestId(field: FieldConfig): string | null {
  switch (field.type) {
    case 'checkbox':
      return `checkbox-${field.id}`;
    case 'singleSelect':
      return field.options?.[0] ? `radio-${field.id}-${field.options[0].value}` : null;
    case 'integer':
    case 'decimal':
      return `input-${field.id}`;
    case 'multiSelect':
    case 'multiSelectMultiAttribute':
    case 'checkboxGroup':
      return field.options?.[0] ? `chip-${field.id}-${field.options[0].value}` : null;
    case 'singleSelectMultiAttribute':
      return field.options?.[0] ? `radio-${field.id}-${field.options[0].label}` : null;
    default:
      return null;
  }
}

// ─── Generate section flow ──────────────────────────────────────

function generateSectionFlow(
  calculator: CalculatorConfig,
  section: SectionConfig,
  sectionIndex: number,
  opts: GeneratorOptions,
  triggers: Map<string, Map<string, number>>,
  apiKeyToField: Map<string, FieldConfig>,
): GeneratedFlow {
  const lines: string[] = [];
  const padIdx = String(sectionIndex + 1).padStart(2, '0');
  const name = `${calculator.name} — ${section.name}`;
  const tags = [opts.platform, calculator.id, 'generated', section.id];

  lines.push(yamlHeader(name, opts.appId, tags));
  lines.push('');

  // Section header comment (no tab navigation — all sections are in one continuous ScrollView)
  lines.push(`# ═══ ${section.name} ═══`);
  lines.push('');

  let fieldCount = 0;

  // Process direct fields (topologically sorted)
  const directFields = section.fields || [];
  if (directFields.length > 0) {
    const sorted = topologicalSortFields(directFields, apiKeyToField);
    for (const field of sorted) {
      const isConditional = !!field.visibleIf && field.visibleIf.length > 0;
      const steps = stepsForField(field, triggers, isConditional);
      if (steps.length > 0) {
        lines.push(...steps);
        lines.push('');
        if (field.type !== 'infoText' && !field.disabled) fieldCount++;
      }
    }
  }

  // Process subsections
  const subsections = section.subsections || [];
  for (const sub of subsections) {
    lines.push(`# ── Subsection: ${sub.name} ──`);
    lines.push(`- scrollUntilVisible:`);
    lines.push(`    element:`);
    lines.push(`      id: "tab-${sub.id}"`);
    lines.push(`    direction: DOWN`);
    lines.push(`    timeout: 10000`);
    lines.push(`- tapOn:`);
    lines.push(`    id: "tab-${sub.id}"`);
    lines.push(`- waitForAnimationToEnd:`);
    lines.push(`    timeout: 3000`);
    lines.push('');

    const subFields = sub.fields || [];
    const sorted = topologicalSortFields(subFields, apiKeyToField);
    for (const field of sorted) {
      const isConditional = !!field.visibleIf && field.visibleIf.length > 0;
      const steps = stepsForField(field, triggers, isConditional);
      if (steps.length > 0) {
        lines.push(...steps);
        lines.push('');
        if (field.type !== 'infoText' && !field.disabled) fieldCount++;
      }
    }
  }

  const fileName = `${calculator.id}_${padIdx}_${section.id}.yaml`;
  const filePath = path.join(opts.outputDir, calculator.id, fileName);

  return { path: filePath, content: lines.join('\n'), fieldCount };
}

// ─── Generate master flow (self-contained, all fields inline) ───

function generateMasterFlow(
  calculator: CalculatorConfig,
  sectionFlows: GeneratedFlow[],
  opts: GeneratorOptions,
  triggers: Map<string, Map<string, number>>,
  apiKeyToField: Map<string, FieldConfig>,
): GeneratedFlow {
  const lines: string[] = [];
  const name = `${calculator.name} — Full E2E (all fields)`;
  const tags = [opts.platform, calculator.id, 'generated', 'full-coverage'];

  lines.push(yamlHeader(name, opts.appId, tags));
  lines.push('');

  // Login
  lines.push(`# Login`);
  lines.push(`- runFlow:`);
  lines.push(`    file: "${opts.loginFlowPath}"`);
  lines.push('');

  // Navigate to calculator
  lines.push(`# Open ${calculator.name}`);
  lines.push(`- extendedWaitUntil:`);
  lines.push(`    visible:`);
  lines.push(`      id: "calc-${calculator.id}"`);
  lines.push(`    timeout: 15000`);
  lines.push(`- tapOn:`);
  lines.push(`    id: "calc-${calculator.id}"`);
  lines.push(`- waitForAnimationToEnd:`);
  lines.push(`    timeout: 5000`);
  lines.push('');

  // Ensure we start at the very top of the form
  lines.push(`# Scroll to top of form`);
  lines.push(`- swipe:`);
  lines.push(`    direction: DOWN`);
  lines.push(`    duration: 500`);
  lines.push(`- swipe:`);
  lines.push(`    direction: DOWN`);
  lines.push(`    duration: 500`);
  lines.push(`- swipe:`);
  lines.push(`    direction: DOWN`);
  lines.push(`    duration: 500`);
  lines.push(`- swipe:`);
  lines.push(`    direction: DOWN`);
  lines.push(`    duration: 500`);
  lines.push(`- swipe:`);
  lines.push(`    direction: DOWN`);
  lines.push(`    duration: 500`);
  lines.push('');

  let totalFields = 0;

  // Inline ALL sections — scroll down through the entire form
  for (const section of calculator.sections) {
    lines.push(`# ═══ ${section.name} ═══`);
    lines.push('');

    // Direct fields
    const directFields = section.fields || [];
    if (directFields.length > 0) {
      const sorted = topologicalSortFields(directFields, apiKeyToField);
      for (const field of sorted) {
        const isConditional = !!field.visibleIf && field.visibleIf.length > 0;
        const steps = stepsForField(field, triggers, isConditional);
        if (steps.length > 0) {
          lines.push(...steps);
          lines.push('');
          if (field.type !== 'infoText' && !field.disabled) totalFields++;
        }
      }
    }

    // Subsections — scroll to tab, tap it, then fill fields
    const subsections = section.subsections || [];
    for (const sub of subsections) {
      lines.push(`# ── Subsection: ${sub.name} ──`);
      lines.push(`- scrollUntilVisible:`);
      lines.push(`    element:`);
      lines.push(`      id: "tab-${sub.id}"`);
      lines.push(`    direction: DOWN`);
      lines.push(`    timeout: 10000`);
      lines.push(`- tapOn:`);
      lines.push(`    id: "tab-${sub.id}"`);
      lines.push(`- waitForAnimationToEnd:`);
      lines.push(`    timeout: 3000`);
      lines.push('');

      const subFields = sub.fields || [];
      const sorted = topologicalSortFields(subFields, apiKeyToField);
      for (const field of sorted) {
        const isConditional = !!field.visibleIf && field.visibleIf.length > 0;
        const steps = stepsForField(field, triggers, isConditional);
        if (steps.length > 0) {
          lines.push(...steps);
          lines.push('');
          if (field.type !== 'infoText' && !field.disabled) totalFields++;
        }
      }
    }
  }

  lines.push(`# Total fields covered: ${totalFields}`);

  const filePath = path.join(opts.outputDir, calculator.id, `${calculator.id}_full.yaml`);

  return { path: filePath, content: lines.join('\n'), fieldCount: totalFields };
}

// ─── Main generator ─────────────────────────────────────────────

export function generateFlows(opts: GeneratorOptions): {
  flows: GeneratedFlow[];
  summary: { calculator: string; sections: number; fields: number }[];
} {
  // Read calculatorConfig.json
  const rawConfig = JSON.parse(fs.readFileSync(opts.configPath, 'utf-8'));
  const calculators: CalculatorConfig[] = rawConfig;

  const results: GeneratedFlow[] = [];
  const summary: { calculator: string; sections: number; fields: number }[] = [];

  for (const calc of calculators) {
    // Filter to specific calculator if requested
    if (opts.calculatorId && calc.id !== opts.calculatorId) continue;

    const triggers = buildDependencyTriggers(calc);
    const apiKeyToField = buildApiKeyToFieldMap(calc);

    const sectionFlows: GeneratedFlow[] = [];

    for (let i = 0; i < calc.sections.length; i++) {
      const section = calc.sections[i];
      const flow = generateSectionFlow(calc, section, i, opts, triggers, apiKeyToField);
      sectionFlows.push(flow);
    }

    const masterFlow = generateMasterFlow(calc, sectionFlows, opts, triggers, apiKeyToField);

    // Write files (unless dry-run)
    if (!opts.dryRun) {
      for (const flow of [...sectionFlows, masterFlow]) {
        const dir = path.dirname(flow.path);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(flow.path, flow.content, 'utf-8');
      }
    }

    results.push(...sectionFlows, masterFlow);
    summary.push({
      calculator: calc.name,
      sections: sectionFlows.length,
      fields: masterFlow.fieldCount,
    });
  }

  return { flows: results, summary };
}
