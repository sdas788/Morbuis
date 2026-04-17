/**
 * Dependency graph for visibleIf conditions in calculatorConfig.json.
 * Enables topological sorting of fields so prerequisites are filled first,
 * and builds trigger maps for optimal test value selection.
 */

import type { FieldConfig, VisibleIfCondition } from './test-data.js';

export interface SectionConfig {
  id: string;
  name: string;
  fields: FieldConfig[];
  subsections?: SubsectionConfig[];
}

export interface SubsectionConfig {
  id: string;
  name: string;
  fields: FieldConfig[];
}

export interface CalculatorConfig {
  id: string;
  name: string;
  sections: SectionConfig[];
}

/**
 * Build a map: apiKey -> { value -> count of fields that become visible }.
 * Used by test-data.ts to pick option values that maximize field visibility.
 */
export function buildDependencyTriggers(
  calculator: CalculatorConfig,
): Map<string, Map<string, number>> {
  const triggers = new Map<string, Map<string, number>>();

  const allFields = getAllFields(calculator);
  for (const field of allFields) {
    if (!field.visibleIf) continue;
    for (const condition of field.visibleIf) {
      if (!triggers.has(condition.apiKey)) {
        triggers.set(condition.apiKey, new Map());
      }
      const valueMap = triggers.get(condition.apiKey)!;
      const values = Array.isArray(condition.value)
        ? condition.value
        : [condition.value];
      for (const v of values) {
        valueMap.set(String(v), (valueMap.get(String(v)) || 0) + 1);
      }
    }
  }

  return triggers;
}

/**
 * Get all fields from a calculator (sections + subsections) flattened.
 */
export function getAllFields(calculator: CalculatorConfig): FieldConfig[] {
  const fields: FieldConfig[] = [];
  for (const section of calculator.sections) {
    fields.push(...(section.fields || []));
    for (const sub of section.subsections || []) {
      fields.push(...(sub.fields || []));
    }
  }
  return fields;
}

/**
 * Build apiKey→field lookup for the entire calculator.
 */
export function buildApiKeyToFieldMap(
  calculator: CalculatorConfig,
): Map<string, FieldConfig> {
  const map = new Map<string, FieldConfig>();
  const allFields = getAllFields(calculator);
  for (const field of allFields) {
    if (typeof field.apiKey === 'string') {
      map.set(field.apiKey, field);
    } else if (Array.isArray(field.apiKey)) {
      for (const key of field.apiKey) {
        map.set(key, field);
      }
    }
  }
  return map;
}

/**
 * Topologically sort fields within a section/subsection.
 * Fields whose visibility depends on other fields in the same group come after their prerequisites.
 */
export function topologicalSortFields(
  fields: FieldConfig[],
  apiKeyToField: Map<string, FieldConfig>,
): FieldConfig[] {
  // Build field id set for this group
  const fieldIds = new Set(fields.map(f => f.id));

  // Build adjacency: field.id -> set of field.ids it depends on (within this group)
  const deps = new Map<string, Set<string>>();
  for (const field of fields) {
    deps.set(field.id, new Set());
    if (!field.visibleIf) continue;
    for (const condition of field.visibleIf) {
      const parentField = apiKeyToField.get(condition.apiKey);
      if (parentField && fieldIds.has(parentField.id)) {
        deps.get(field.id)!.add(parentField.id);
      }
    }
  }

  // Kahn's algorithm — preserving original form order
  // Map field id to its original position index for stable ordering
  const originalIndex = new Map<string, number>();
  fields.forEach((f, i) => originalIndex.set(f.id, i));

  const inDegree = new Map<string, number>();
  for (const field of fields) {
    inDegree.set(field.id, deps.get(field.id)?.size || 0);
  }

  // Priority queue: always process the field with the lowest original index first
  const available: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) available.push(id);
  }
  // Sort by original position so form order is preserved
  available.sort((a, b) => (originalIndex.get(a) || 0) - (originalIndex.get(b) || 0));

  const sorted: FieldConfig[] = [];
  const fieldMap = new Map(fields.map(f => [f.id, f]));

  while (available.length > 0) {
    const id = available.shift()!;
    sorted.push(fieldMap.get(id)!);
    // Reduce in-degree of fields that depend on this one
    for (const [otherId, otherDeps] of deps) {
      if (otherDeps.has(id)) {
        otherDeps.delete(id);
        inDegree.set(otherId, (inDegree.get(otherId) || 1) - 1);
        if (inDegree.get(otherId) === 0) {
          // Insert into available list maintaining original position order
          const idx = originalIndex.get(otherId) || 0;
          let insertAt = available.length;
          for (let i = 0; i < available.length; i++) {
            if ((originalIndex.get(available[i]) || 0) > idx) {
              insertAt = i;
              break;
            }
          }
          available.splice(insertAt, 0, otherId);
        }
      }
    }
  }

  // Append any remaining fields (circular deps fallback — shouldn't happen)
  for (const field of fields) {
    if (!sorted.find(f => f.id === field.id)) {
      sorted.push(field);
    }
  }

  return sorted;
}
