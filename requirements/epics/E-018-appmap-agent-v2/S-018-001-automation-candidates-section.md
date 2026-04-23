# Automation Candidates Section in AppMap View

**ID:** S-018-001
**Project:** morbius
**Epic:** E-018
**Stage:** Draft
**Status:** Todo
**Priority:** P1
**Version:** 1.0
**Created:** 2026-04-23
**Updated:** 2026-04-23

---

## Story

As a QA lead, I want a new section below the existing AppMap that lists flows recommended for automation so that I can see the action layer below the description layer.

## Acceptance Criteria

**Given** an AppMap has been generated for a project
**When** I scroll below the map
**Then** a "Automation Candidates" section shows a ranked list of flows with: name, priority, rationale, coverage status (covered / partial / none)

**Given** a candidate is already covered by an existing Maestro flow
**When** the section renders
**Then** that candidate is visually deprioritized (strikethrough or gray) with a link to the existing flow

**Given** no candidates have been generated yet
**When** the section renders
**Then** a "Generate candidates" button triggers agent run (see S-018-002)

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
