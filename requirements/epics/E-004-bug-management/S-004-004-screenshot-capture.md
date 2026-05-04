# Story: Failure Screenshot Capture + Inline Preview

**ID:** S-004-004
**Project:** morbius
**Epic:** E-004
**Stage:** Ready
**Status:** Done
**Priority:** P1
**Version:** 1.0
**Created:** 2026-04-21
**Updated:** 2026-04-21

---

## Story

As a developer, I want failure screenshots from Maestro runs to be automatically captured and displayed inline on bug cards, so I can see exactly what the device showed when the test failed without navigating to a separate folder.

## Acceptance Criteria

**Given** a Maestro flow fails and produces a screenshot  
**When** the bug is created via ingest  
**Then** the screenshot is copied to `data/{project}/screenshots/{bugId}/` and served via `GET /screenshots/<path>`

**Given** I open a bug card with a screenshot  
**When** the detail panel renders  
**Then** the screenshot is shown as an inline image in the panel

**Given** I click the screenshot thumbnail  
**When** the image expands  
**Then** it opens at full resolution (not cropped)

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-21 | 1.0 | PM Agent | Created via reverse-engineer |
