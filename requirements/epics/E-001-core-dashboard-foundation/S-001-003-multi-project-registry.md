# Story: Multi-Project Registry + Active Project Switching

**ID:** S-001-003
**Project:** morbius
**Epic:** E-001
**Stage:** Ready
**Status:** Done
**Priority:** P1
**Version:** 1.0
**Created:** 2026-04-21
**Updated:** 2026-04-21

---

## Story

As a QA lead, I want to switch between multiple app projects (Micro-Air, STS, Shorr) from the sidebar, so the dashboard loads the correct test cases, bugs, and config for the selected project without restarting the server.

## Acceptance Criteria

**Given** multiple projects are registered in `data/projects.json`  
**When** I click a project name in the sidebar  
**Then** the dashboard reloads with that project's data and all tabs reflect the new project

**Given** a new project is created  
**When** I run `POST /api/projects/create`  
**Then** a new folder is created under `data/` with config.json and empty test/bug/runs directories

**Given** the server starts  
**When** no active project is set  
**Then** the first registered project is loaded automatically

## Do Not Do

- Do not require a server restart to switch projects
- Do not mix test cases or bugs from different projects in any view

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-21 | 1.0 | PM Agent | Created via reverse-engineer |
