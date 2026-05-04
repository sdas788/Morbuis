import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import XLSX from 'xlsx';
import type { TestCase, Category, SyncMeta, TestStatus, Priority } from '../types.js';
import { writeTestCase, writeCategory } from './markdown.js';
import { DATA_DIR } from '../data-dir.js';

const SYNC_META_PATH = path.join(DATA_DIR, '.sync-meta.json');

// Sheets to skip (metadata/summary sheets, not test sheets)
const SKIP_SHEETS = new Set([
  'Summary', 'Summary ', 'Dashboard', 'Index', 'Template', 'README',
  'Common Issues', 'Common Issues ', 'Scope', 'Blank', 'E2E Flows',
  'Definitions', 'Definitions ',
]);

// Excel column indices (0-based) — discovered from actual file:
// Row 6: ["ID","Steps","Acceptance Criteria","Scenario","Status","Notes","","Results - IPAD"]
const COL = {
  ID: 0,           // A
  STEPS: 1,        // B
  CRITERIA: 2,     // C
  SCENARIO: 3,     // D
  STATUS: 4,       // E
  NOTES: 5,        // F
  // G is empty
  IPAD: 7,         // H
  IPHONE: 8,       // I
  ANDROID_TAB: 9,  // J
  ANDROID_PHONE: 10, // K
};

const HEADER_ROW = 6; // Row 7 in Excel (0-indexed = 6)
const DATA_START_ROW = 7; // Row 8 in Excel (0-indexed = 7)

export interface ImportResult {
  categories: number;
  testCases: number;
  skippedSheets: string[];
}

// S-014-002: Preview shape — same parsing as importExcel but returns in-memory data
// (no disk writes), so the UI can show the user what's about to land before commit.
export interface ParsedCategory {
  id: string;             // slug
  name: string;
  sheet: string;
  order: number;
  testCases: TestCase[];
}

export interface ParsedExcel {
  categories: ParsedCategory[];
  totalTestCases: number;
  skippedSheets: string[];
  excelMtime: string;
  checksums: Record<string, string>;
}

export function parseExcelFile(xlsxPath: string): ParsedExcel {
  const absolutePath = path.resolve(xlsxPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Excel file not found: ${absolutePath}`);
  }

  const workbook = XLSX.readFile(absolutePath);
  const out: ParsedExcel = {
    categories: [],
    totalTestCases: 0,
    skippedSheets: [],
    excelMtime: fs.statSync(absolutePath).mtime.toISOString(),
    checksums: {},
  };
  let categoryOrder = 0;

  for (const sheetName of workbook.SheetNames) {
    if (SKIP_SHEETS.has(sheetName.trim())) { out.skippedSheets.push(sheetName); continue; }

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (rows.length <= HEADER_ROW) { out.skippedSheets.push(sheetName); continue; }

    let headerIdx = -1;
    for (let r = 0; r < Math.min(rows.length, 15); r++) {
      const row = rows[r] as string[];
      if (!row) continue;
      const rowStr = row.map(c => String(c ?? '').toLowerCase()).join('|');
      if (rowStr.includes('id') && (rowStr.includes('step') || rowStr.includes('scenario'))) {
        headerIdx = r; break;
      }
    }
    if (headerIdx === -1) { out.skippedSheets.push(sheetName); continue; }

    const dataStartRow = headerIdx + 1;
    const categorySlug = slugify(sheetName);
    const cat: ParsedCategory = {
      id: categorySlug, name: sheetName.trim(), sheet: sheetName,
      order: categoryOrder++, testCases: [],
    };

    for (let i = dataStartRow; i < rows.length; i++) {
      const row = rows[i] as (string | number | undefined)[];
      if (!row) continue;
      const rawId = row[COL.ID];
      if (rawId === undefined || rawId === null || rawId === '') continue;
      const id = formatTestId(rawId);
      if (!id) continue;

      const steps = String(row[COL.STEPS] ?? '').trim();
      const criteria = String(row[COL.CRITERIA] ?? '').trim();
      if (!steps && !criteria) continue;

      const scenario = String(row[COL.SCENARIO] ?? 'Happy Path').trim();
      const excelStatus = String(row[COL.STATUS] ?? '').trim();
      const notes = String(row[COL.NOTES] ?? '').trim();
      const deviceResults = parseDeviceColumns(row);
      const title = deriveTitle(steps, scenario, id);

      cat.testCases.push({
        id, title, category: categorySlug, scenario,
        status: mapExcelStatus(excelStatus, deviceResults),
        priority: 'P2' as Priority,
        steps: formatSteps(steps),
        acceptanceCriteria: criteria,
        notes,
        platforms: inferPlatforms(deviceResults),
        tags: [scenario.toLowerCase().replace(/\s+/g, '-')],
        deviceResults,
        history: [],
        created: new Date().toISOString().split('T')[0],
        updated: new Date().toISOString().split('T')[0],
      });

      out.checksums[`${sheetName}:${id}`] = computeChecksum(row);
    }

    out.categories.push(cat);
    out.totalTestCases += cat.testCases.length;
  }

  return out;
}

// Persist a previously-parsed structure. Used by importExcel; also callable
// directly by callers that want the parse → preview → write split (S-014-002).
export function writeParsedExcel(parsed: ParsedExcel, targetDir?: string): ImportResult {
  const dataDir = targetDir ?? DATA_DIR;
  const result: ImportResult = { categories: 0, testCases: 0, skippedSheets: [...parsed.skippedSheets] };

  for (const cat of parsed.categories) {
    const categoryDir = path.join(dataDir, 'tests', cat.id);
    writeCategory({ id: cat.id, name: cat.name, sheet: cat.sheet, order: cat.order } as Category, categoryDir);
    result.categories++;
    for (const tc of cat.testCases) {
      writeTestCase(tc, categoryDir);
      result.testCases++;
    }
  }

  const syncMeta: SyncMeta = {
    lastImport: new Date().toISOString(),
    excelModified: parsed.excelMtime,
    checksums: parsed.checksums,
  };
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, '.sync-meta.json'), JSON.stringify(syncMeta, null, 2), 'utf-8');

  return result;
}

export function importExcel(xlsxPath: string, targetDir?: string): ImportResult {
  return writeParsedExcel(parseExcelFile(xlsxPath), targetDir);
}

export function getSyncMeta(dataDir?: string): SyncMeta | null {
  const syncMetaPath = path.join(dataDir ?? DATA_DIR, '.sync-meta.json');
  if (!fs.existsSync(syncMetaPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(syncMetaPath, 'utf-8')) as SyncMeta;
  } catch {
    return null;
  }
}

// --- Helpers ---

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatTestId(raw: unknown): string | null {
  if (typeof raw === 'number') {
    // Excel might give us 1.01 as a number
    const formatted = raw.toFixed(2);
    return `TC-${formatted}`;
  }
  const str = String(raw).trim();
  if (!str || str === '0') return null;

  // Already has TC- prefix
  if (str.startsWith('TC-')) return str;

  // Numeric like "1.01"
  const num = parseFloat(str);
  if (!isNaN(num) && num > 0) {
    return `TC-${num.toFixed(2)}`;
  }

  return null;
}

function deriveTitle(steps: string, scenario: string, id: string): string {
  // Try to get a meaningful title from the first step or line
  const firstLine = steps.split('\n')[0]?.trim() ?? '';

  // If the first line is short enough, use it
  if (firstLine.length > 5 && firstLine.length <= 80) {
    // Clean up common prefixes
    const cleaned = firstLine
      .replace(/^\d+[.)]\s*/, '')  // Remove "1. " or "1) "
      .replace(/^[-*]\s*/, '')     // Remove "- " or "* "
      .trim();
    if (cleaned.length > 5) {
      return `${cleaned} - ${scenario}`;
    }
  }

  return `${scenario} (${id})`;
}

function formatSteps(raw: string): string {
  if (!raw) return '';

  // If already has numbered steps, return as-is
  if (/^\d+[.)]\s/.test(raw.trim())) return raw;

  // Split on common delimiters and number them
  const lines = raw.split(/\n|(?<=\.)\s+(?=[A-Z])/).filter(l => l.trim());
  if (lines.length <= 1) return raw;

  return lines.map((line, i) => `${i + 1}. ${line.trim()}`).join('\n');
}

function parseDeviceColumns(row: (string | number | undefined)[]): Array<{ device: string; status: TestStatus; }> {
  const results: Array<{ device: string; status: TestStatus }> = [];

  const deviceMap: [number, string][] = [
    [COL.IPAD, 'ipad'],
    [COL.IPHONE, 'iphone'],
    [COL.ANDROID_TAB, 'android-tab'],
    [COL.ANDROID_PHONE, 'android-phone'],
  ];

  for (const [col, device] of deviceMap) {
    const val = String(row[col] ?? '').trim().toLowerCase();
    if (val) {
      results.push({ device, status: mapDeviceStatus(val) });
    }
  }

  return results;
}

function mapDeviceStatus(val: string): TestStatus {
  const lower = val.toLowerCase();
  if (lower === 'pass' || lower === 'passed' || lower === 'p') return 'pass';
  if (lower === 'fail' || lower === 'failed' || lower === 'f') return 'fail';
  if (lower === 'flaky') return 'flaky';
  if (lower === 'in progress' || lower === 'ip') return 'in-progress';
  return 'not-run';
}

function mapExcelStatus(val: string, deviceResults: Array<{ status: TestStatus }>): TestStatus {
  const lower = val.toLowerCase();
  if (lower === 'pass' || lower === 'passed' || lower === 'complete') return 'pass';
  if (lower === 'fail' || lower === 'failed') return 'fail';
  if (lower === 'in progress') return 'in-progress';

  // Derive from device results if Excel status is empty
  if (!val && deviceResults.length > 0) {
    const hasFailure = deviceResults.some(d => d.status === 'fail');
    const hasPass = deviceResults.some(d => d.status === 'pass');
    if (hasFailure && hasPass) return 'flaky';
    if (hasFailure) return 'fail';
    if (hasPass) return 'pass';
  }

  return 'not-run';
}

function inferPlatforms(deviceResults: Array<{ device: string }>): string[] {
  const platforms = new Set<string>();
  for (const dr of deviceResults) {
    if (dr.device.startsWith('android')) platforms.add('android');
    if (dr.device === 'ipad' || dr.device === 'iphone') platforms.add('ios');
  }
  return platforms.size > 0 ? Array.from(platforms) : ['android', 'ios'];
}

function computeChecksum(row: unknown[]): string {
  const content = JSON.stringify(row);
  return crypto.createHash('md5').update(content).digest('hex').slice(0, 12);
}

// ============================================================
// Export: Markdown → Excel
// ============================================================

export interface ExportResult {
  sheetsUpdated: number;
  cellsUpdated: number;
}

export function exportToExcel(xlsxPath: string, tests: TestCase[]): ExportResult {
  const absolutePath = path.resolve(xlsxPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Excel file not found: ${absolutePath}`);
  }

  const workbook = XLSX.readFile(absolutePath);
  const result: ExportResult = { sheetsUpdated: 0, cellsUpdated: 0 };

  // Group tests by their original sheet (category)
  const testsBySheet = new Map<string, TestCase[]>();
  for (const test of tests) {
    // Find which sheet this test belongs to by checking categories
    const catDir = path.join(DATA_DIR, 'tests', test.category);
    const catFile = path.join(catDir, '_category.yaml');
    let sheetName = test.category;
    if (fs.existsSync(catFile)) {
      const catYaml = fs.readFileSync(catFile, 'utf-8');
      const sheetMatch = catYaml.match(/sheet:\s*['"]?(.+?)['"]?\s*$/m);
      if (sheetMatch) sheetName = sheetMatch[1].trim();
    }

    if (!testsBySheet.has(sheetName)) testsBySheet.set(sheetName, []);
    testsBySheet.get(sheetName)!.push(test);
  }

  for (const [sheetName, sheetTests] of testsBySheet) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    // Find header row
    let headerIdx = -1;
    for (let r = 0; r < Math.min(rows.length, 15); r++) {
      const row = rows[r] as string[];
      if (!row) continue;
      const rowStr = row.map(c => String(c ?? '').toLowerCase()).join('|');
      if (rowStr.includes('id') && (rowStr.includes('step') || rowStr.includes('scenario'))) {
        headerIdx = r;
        break;
      }
    }
    if (headerIdx === -1) continue;

    let sheetUpdated = false;

    // Match tests to rows by ID
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i] as (string | number | undefined)[];
      if (!row) continue;
      const rowId = formatTestId(row[COL.ID]);
      if (!rowId) continue;

      const test = sheetTests.find(t => t.id === rowId);
      if (!test) continue;

      // Write status back (column E)
      const excelStatus = mapStatusToExcel(test.status);
      if (excelStatus) {
        const cellRef = XLSX.utils.encode_cell({ r: i, c: COL.STATUS });
        sheet[cellRef] = { t: 's', v: excelStatus };
        result.cellsUpdated++;
        sheetUpdated = true;
      }

      // Write notes back (column F)
      if (test.notes) {
        const cellRef = XLSX.utils.encode_cell({ r: i, c: COL.NOTES });
        sheet[cellRef] = { t: 's', v: test.notes };
        result.cellsUpdated++;
        sheetUpdated = true;
      }

      // Write device results back
      const deviceColMap: [string, number][] = [
        ['ipad', COL.IPAD],
        ['iphone', COL.IPHONE],
        ['android-tab', COL.ANDROID_TAB],
        ['android-phone', COL.ANDROID_PHONE],
      ];
      for (const [deviceId, col] of deviceColMap) {
        const deviceResult = test.deviceResults.find(dr => dr.device === deviceId);
        if (deviceResult) {
          const cellRef = XLSX.utils.encode_cell({ r: i, c: col });
          sheet[cellRef] = { t: 's', v: mapStatusToExcel(deviceResult.status) ?? '' };
          result.cellsUpdated++;
          sheetUpdated = true;
        }
      }
    }

    if (sheetUpdated) result.sheetsUpdated++;
  }

  // Write the workbook back
  XLSX.writeFile(workbook, absolutePath);
  return result;
}

function mapStatusToExcel(status: TestStatus): string | null {
  switch (status) {
    case 'pass': return 'Pass';
    case 'fail': return 'Fail';
    case 'flaky': return 'Pass w/Defects';
    case 'in-progress': return 'In Progress';
    case 'not-run': return null; // Don't overwrite
    default: return null;
  }
}

