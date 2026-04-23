# Run Media Viewer (Videos + Screenshots)

**ID:** S-006-005
**Project:** morbius
**Epic:** E-006
**Stage:** Ready
**Status:** Done
**Priority:** P2
**Version:** 1.0
**Created:** 2026-04-21
**Updated:** 2026-04-21

---

## Story

As a developer, I want to view test run videos and screenshots directly in the dashboard from the Runs tab, so I can replay a failing test's screen recording without navigating to the file system.

## Acceptance Criteria

**Given** a test run has media files (screenshots, screen recordings) in the configured `mediaPath`  
**When** I open the Runs tab and click a run  
**Then** a media gallery shows all screenshots and videos from that run

**Given** I run `morbius ingest-media --timestamp`  
**When** the command runs  
**Then** the latest Maestro run's media is copied from the Maestro output directory to the project `mediaPath`

**Given** the `mediaPath` is outside the project root  
**When** media is served  
**Then** it is served via `GET /media/<path>` (not `GET /screenshots/<path>`) to avoid path conflicts

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-21 | 1.0 | PM Agent | Created via reverse-engineer |
