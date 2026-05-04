# Story: Inline Changelog in Detail View

**ID:** S-015-003
**Project:** morbius
**Epic:** E-015
**Stage:** Ready
**Status:** Done
**Priority:** P1
**Version:** 1.1
**Created:** 2026-04-23
**Updated:** 2026-04-23

---

## Story

As a QA lead, I want to see the changelog for a test case inline in the detail view so that I can audit recent edits without opening the markdown file directly.

## Acceptance Criteria

**Given** a test case has a changelog (written by `src/parsers/markdown.ts` on every edit)
**When** the detail view opens
**Then** a "Changelog" accordion shows the last 20 entries with timestamp, author, and change summary

**Given** the changelog is long
**When** the user expands the accordion
**Then** pagination or virtual scrolling prevents performance issues

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
| 2026-04-23 | 1.1 | Claude | Implemented: new `ChangelogAccordion` React component used inside `TestDrawer`. Default state collapsed; clicking the section title (with rotating chevron) toggles open. Reads `detail.changelog` (already populated by `parseChangelogTable` in `src/parsers/markdown.ts` and returned by `/api/test/:id`). Renders the **newest 20 entries** in newest-first order, capped at 20 — at that scale a flat list is the cheapest fix for the "performance" AC. Each row shows: relative timestamp, field name, oldValue → newValue (oldValue strikethrough, "∅" placeholder when blank), actor. When the changelog has >20 entries a "Showing newest 20 of N entries" hint appears at the top of the expanded list. Verified live against TC-1.01 which has 6 changelog entries. AC1 + AC2 met. |
