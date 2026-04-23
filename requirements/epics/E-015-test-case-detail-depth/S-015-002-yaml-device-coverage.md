# Maestro YAML + Device Coverage Panel

**ID:** S-015-002
**Project:** morbius
**Epic:** E-015
**Stage:** Draft
**Status:** Todo
**Priority:** P0
**Version:** 1.0
**Created:** 2026-04-23
**Updated:** 2026-04-23

---

## Story

As a QA lead, I want to see the linked Maestro YAML and device coverage for a test case inside its detail view so that I can judge test depth and gaps without leaving the modal.

## Acceptance Criteria

**Given** a test case with a linked Maestro flow
**When** the detail view opens
**Then** a "Flow" section shows the rendered human-readable YAML steps (reusing `src/parsers/maestro-yaml.ts`)

**Given** a test case has run on multiple devices
**When** the detail view opens
**Then** a "Device Coverage" section shows a grid of (device × pass/fail/not-run) status (reusing E-005 device matrix data)

**Given** a test case has no linked flow
**When** the detail view opens
**Then** the Flow section shows "No automated flow yet" with a link to AppMap v2 (E-018) for recommendations

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
