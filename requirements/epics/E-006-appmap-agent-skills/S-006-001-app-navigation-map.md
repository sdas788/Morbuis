# Story: App Navigation Map (Mermaid Flowchart)

**ID:** S-006-001
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

As a developer, I want a visual Mermaid flowchart of the app's navigation structure stored in the project config and rendered in the dashboard, so any new team member can understand the app's screen flow without running the app.

## Acceptance Criteria

**Given** an `appMap` field exists in `config.json`  
**When** I navigate to the App Map section  
**Then** the Mermaid chart is rendered showing all screens and transitions

**Given** I update the `appMap` field via `POST /api/config/update`  
**When** I reload  
**Then** the new chart is displayed immediately

**Given** the `appMap` field is empty  
**When** I open the App Map  
**Then** a placeholder message explains how to add the app map

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-21 | 1.0 | PM Agent | Created via reverse-engineer |
