import fs from 'node:fs';
import path from 'node:path';

export interface CalculatorField {
  id: string;
  name: string;
  type: string;
  required: boolean;
  apiKey?: string;
  visibleIf?: string;
}

export interface Calculator {
  id: string;
  name: string;
  description?: string;
  fields: CalculatorField[];
}

export interface CoverageResult {
  id: string;
  name: string;
  totalFields: number;
  coveredFields: string[];
  uncoveredFields: string[];
  coveragePct: number;
  linkedTests: string[];
}

/**
 * Parse the STS calculatorConfig.json and return all calculators with their fields flattened.
 * The config is a root array of calculators, each with sections → fields.
 */
export function parseCalculatorConfig(configPath: string): Calculator[] {
  const raw: any[] = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  return raw.map((calc: any) => {
    const fields: CalculatorField[] = [];
    for (const section of (calc.sections ?? [])) {
      for (const field of (section.fields ?? [])) {
        fields.push(normalizeField(field));
        // Handle nested subsections
        for (const sub of (field.subsections ?? [])) {
          for (const subField of (sub.fields ?? [])) {
            fields.push(normalizeField(subField));
          }
        }
      }
    }
    return {
      id: calc.id,
      name: calc.name,
      description: calc.description,
      fields,
    };
  });
}

function normalizeField(f: any): CalculatorField {
  return {
    id: f.id ?? '',
    name: f.name ?? f.label ?? '',
    type: f.type ?? 'unknown',
    required: f.required ?? false,
    apiKey: f.apiKey,
    visibleIf: typeof f.visibleIf === 'string' ? f.visibleIf : undefined,
  };
}

/**
 * Build coverage results by cross-referencing calculator fields against
 * Maestro YAML flows and test case markdown files.
 */
export function buildCoverageMatrix(
  calculators: Calculator[],
  yamlPaths: string[],  // all YAML flow file paths (android + ios)
  testFiles: string[],  // all test case .md file paths
): CoverageResult[] {
  // Build a set of all text content from YAMLs and test files
  const yamlContent = yamlPaths.map(p => {
    try { return fs.readFileSync(p, 'utf-8').toLowerCase(); } catch { return ''; }
  }).join('\n');

  const testContent = testFiles.map(p => {
    try { return fs.readFileSync(p, 'utf-8').toLowerCase(); } catch { return ''; }
  }).join('\n');

  const allContent = yamlContent + '\n' + testContent;

  return calculators.map(calc => {
    const coveredFields: string[] = [];
    const uncoveredFields: string[] = [];

    for (const field of calc.fields) {
      // A field is "covered" if its id, name, or apiKey appears in any YAML or test file
      const searchTerms = [
        field.id.toLowerCase(),
        field.name.toLowerCase(),
        ...(field.apiKey && typeof field.apiKey === 'string' ? [field.apiKey.toLowerCase()] : []),
      ].filter(t => t.length > 2); // skip trivially short tokens

      const covered = searchTerms.some(term => allContent.includes(term));
      if (covered) {
        coveredFields.push(field.id);
      } else {
        uncoveredFields.push(field.id);
      }
    }

    // Find linked test IDs: test files that mention this calculator's id or name
    const linkedTests: string[] = [];
    const calcNameLower = calc.name.toLowerCase();
    const calcIdLower = calc.id.toLowerCase();
    for (const p of testFiles) {
      try {
        const content = fs.readFileSync(p, 'utf-8').toLowerCase();
        if (content.includes(calcNameLower) || content.includes(calcIdLower)) {
          const match = path.basename(p, '.md');
          if (match) linkedTests.push(match);
        }
      } catch { /* skip */ }
    }

    const total = calc.fields.length;
    const coveragePct = total === 0 ? 0 : Math.round((coveredFields.length / total) * 100);

    return {
      id: calc.id,
      name: calc.name,
      totalFields: total,
      coveredFields,
      uncoveredFields,
      coveragePct,
      linkedTests,
    };
  });
}

/**
 * Recursively find all files matching an extension in a directory.
 */
export function findFiles(dir: string, ext: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(fullPath, ext));
    } else if (entry.name.endsWith(ext)) {
      results.push(fullPath);
    }
  }
  return results;
}
