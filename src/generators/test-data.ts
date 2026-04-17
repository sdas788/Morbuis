/**
 * Test data value selection for Maestro flow generation.
 * Picks sensible values for each field type from calculatorConfig.json.
 */

export interface FieldConfig {
  id: string;
  name: string;
  type: string;
  apiKey: string | string[];
  options?: OptionConfig[];
  units?: UnitConfig[];
  expectedRange?: { min: number; max: number };
  allowedRange?: { min: number; max: number };
  trueValue?: string;
  visibleIf?: VisibleIfCondition[];
  disabled?: boolean;
  required?: boolean;
  apiKeys?: { apiKey: string; value: string | number; trueValue?: string }[];
}

export interface OptionConfig {
  label: string;
  value: string | number;
  disabled?: boolean;
  default?: boolean;
  exclusionCriteria?: string;
  apiKeys?: { apiKey: string; value: string | number }[];
}

export interface UnitConfig {
  label: string;
  conversion: string;
  expectedRange?: { min: number; max: number };
  allowedRange?: { min: number; max: number };
}

export interface VisibleIfCondition {
  apiKey: string;
  comparison: string;
  value: string | string[];
}

/**
 * Extract the first unit config, handling both array and object formats.
 * calculatorConfig.json has units as either [ { ... } ] or { ... }.
 */
function getFirstUnit(
  field: FieldConfig,
): UnitConfig | undefined {
  if (!field.units) return undefined;
  if (Array.isArray(field.units)) return field.units[0];
  // units is a plain object — treat it as the single unit
  return field.units as unknown as UnitConfig;
}

/**
 * Compute a test value for a numeric field (integer or decimal).
 * Priority: expectedRange → allowedRange → hardcoded safe fallback.
 * Uses the midpoint of the range.
 */
export function getNumericTestValue(field: FieldConfig): string {
  const unit = getFirstUnit(field);
  // Check expectedRange first (narrower, clinically normal range)
  const expectedRange = unit?.expectedRange || field.expectedRange;
  // Then allowedRange (wider, but still valid for the field)
  const allowedRange = unit?.allowedRange || (field as any).allowedRange;
  const range = expectedRange || allowedRange;
  if (range) {
    const mid = (range.min + range.max) / 2;
    if (field.type === 'integer') {
      return String(Math.round(mid));
    }
    // Decimal: one decimal place
    return String(Math.round(mid * 10) / 10);
  }
  // Fallback: small reasonable defaults (safe for most medical fields)
  if (field.type === 'integer') return '5';
  return '5.0';
}

/**
 * Pick which option value to select for a singleSelect field.
 * Strategy:
 *  1. Prefer the option that triggers the most visibleIf dependents
 *  2. Otherwise, pick the first non-disabled, non-exclusion option
 *  3. Skip options that are defaults (already selected)
 */
export function getSingleSelectValue(
  field: FieldConfig,
  dependencyTriggers?: Map<string, Map<string, number>>, // apiKey -> value -> count of dependents triggered
): string {
  const options = field.options || [];
  const validOptions = options.filter(
    o => !o.disabled && o.exclusionCriteria !== 'true',
  );

  if (validOptions.length === 0) {
    return String(options[0]?.value || '1');
  }

  // Check if we have dependency information for this field's apiKey
  const apiKey = typeof field.apiKey === 'string' ? field.apiKey : field.apiKey?.[0];
  if (apiKey && dependencyTriggers?.has(apiKey)) {
    const triggerMap = dependencyTriggers.get(apiKey)!;
    let best = validOptions[0];
    let bestCount = 0;
    for (const opt of validOptions) {
      const val = String(opt.value);
      const count = triggerMap.get(val) || 0;
      if (count > bestCount) {
        bestCount = count;
        best = opt;
      }
    }
    if (bestCount > 0) {
      return String(best.value);
    }
  }

  // First non-default, non-disabled option
  const nonDefault = validOptions.find(o => !o.default);
  return String((nonDefault || validOptions[0]).value);
}

/**
 * For multiSelect/multiSelectMultiAttribute, pick the first available option.
 */
export function getMultiSelectValue(field: FieldConfig): string {
  const options = field.options || [];
  const valid = options.find(
    o => !o.disabled && o.exclusionCriteria !== 'true' && !o.default,
  );
  return String((valid || options[0])?.value || '1');
}

/**
 * For checkboxGroup, pick the first non-disabled option.
 */
export function getCheckboxGroupValue(field: FieldConfig): string {
  const options = field.options || [];
  const valid = options.find(
    o => !o.disabled && o.exclusionCriteria !== 'true' && !o.default,
  );
  return String((valid || options[0])?.value || '1');
}
