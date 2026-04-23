# Maestro YAML Flow Generation from Calculator Config

**ID:** S-006-002
**Project:** morbius
**Epic:** E-006
**Stage:** Ready
**Status:** Done
**Priority:** P1
**Version:** 1.0
**Created:** 2026-04-21
**Updated:** 2026-04-21

---

## Story

As a developer, I want to run `morbius generate-flows --config calculatorConfig.json --output flows/` and have complete Maestro YAML generated for each calculator section, so I don't manually write YAML for complex multi-field forms.

## Acceptance Criteria

**Given** a `calculatorConfig.json` with sections and field definitions  
**When** I run `morbius generate-flows`  
**Then** one YAML file is generated per calculator section with the correct tapOn/inputText/scrollUntilVisible commands for each field type (checkbox, singleSelect, integer, multiSelect, dateTime)

**Given** a field has a `visibleIf` dependency  
**When** flow is generated  
**Then** the parent field action appears before the dependent field (topological sort)

**Given** `--dry-run` is passed  
**When** the command runs  
**Then** the generated YAML is printed to stdout without writing any files

**Given** `--platform ios`  
**When** flows are generated  
**Then** iOS-specific command variants are used where Maestro differs between platforms

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-21 | 1.0 | PM Agent | Created via reverse-engineer |
