# Inline Changelog in Detail View

**ID:** S-015-003
**Project:** morbius
**Epic:** E-015
**Stage:** Draft
**Status:** Todo
**Priority:** P1
**Version:** 1.0
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
