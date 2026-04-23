# Impact Tab in Bug Modal

**ID:** S-016-004
**Project:** morbius
**Epic:** E-016
**Stage:** Draft
**Status:** Todo
**Priority:** P0
**Version:** 1.0
**Created:** 2026-04-23
**Updated:** 2026-04-23

---

## Story

As a QA lead viewing a bug, I want an "Impact" tab next to the existing bug detail tabs so that I can see the AI-generated impact analysis as part of my normal bug triage flow.

## Acceptance Criteria

**Given** a bug modal is open
**When** the Impact tab is clicked
**Then** the impact.md content renders (via existing `marked` pipeline) with sections visually separated: Related Tests (Rerun) highlighted red, Manual Verify highlighted orange, Repro Narrative in default

**Given** an impact analysis exists
**When** the tab renders
**Then** the generatedAt timestamp and risk score are prominent; a "Regenerate" button triggers a fresh run

**Given** the Impact tab uses the shared Agent Panel pattern (arch.md)
**When** the tab renders
**Then** visual style matches the panels in E-017 and E-018 (consistency)

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
