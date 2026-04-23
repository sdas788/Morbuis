## Changes from v1.0

**Revision type:** 
**Find the implementation:** `git log --oneline --all --grep=""`

| Section | Change |
|---------|--------|
| | |

---

# Maestro Tab — Flow Browser + Human-Readable Step View

**ID:** S-003-001
**Project:** morbius
**Epic:** E-003
**Stage:** Draft
**Status:** Backlog
**Priority:** P1
**Version:** 1.0
**Created:** 2026-04-21
**Updated:** 2026-04-21

---

## Story

As a developer, I want a Maestro tab that lists all YAML flows from the configured Android and iOS paths, shows a human-readable breakdown of each flow's steps, and highlights fragile selectors — so anyone on the team can understand what a test does without reading raw YAML.

## Acceptance Criteria

**Given** Android and iOS flow paths are configured  
**When** I open the Maestro tab  
**Then** all YAML files are listed as a file browser, switchable between Android and iOS

**Given** I click a flow  
**When** it opens  
**Then** I see: human-readable step list (tapOn → "Tap on X", inputText → "Enter: Y"), the raw YAML with syntax highlighting, and any selector warnings (pixel taps, hardcoded sleeps >3s, index selectors)

**Given** a flow references another flow via `runFlow`  
**When** displayed  
**Then** the referenced flow is shown as a linked step

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-21 | 1.0 | PM Agent | Created via reverse-engineer |
